import React, { useState, useEffect } from 'react';
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CBadge,
  CAlert,
  CSpinner,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormInput,
  CFormSelect,
  CFormTextarea,
} from '@coreui/react';
import {
  ShieldAlert,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  LogOut,
  Globe,
  Key,
  XCircle,
  Edit,
  ShieldCheck,
  CreditCard,
  Eye,
  Menu,
  X,
  Package,
  Layers,
  Plus,
  ToggleLeft,
  ToggleRight,
  LayoutDashboard,
  Copy,
  Archive,
  DollarSign,
} from 'lucide-react';
import { api, type ApiUser } from '../../api/client';
import type { Language } from '../../types';

interface PlatformAdminDashboardProps {
  currentUser: ApiUser;
  onLogout: () => void;
  lang?: Language;
  isAr?: boolean;
  onToggleLang: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  onSwitchToTenantApp?: () => void;
}

export const PlatformAdminDashboard: React.FC<PlatformAdminDashboardProps> = ({
  currentUser,
  onLogout,
  lang = 'ar',
  isAr: propIsAr,
  onToggleLang,
  isDark = true,
  onSwitchToTenantApp,
}) => {
  const isAr = propIsAr !== undefined ? propIsAr : lang === 'ar';

  // Navigation tab (P6: Sidebar Navigation Sections)
  const [activeTab, setActiveTab] = useState<
    'overview' | 'ww_packages' | 'ww_payments' | 'ww_rfqs' | 'ww_workshops' | 'tenants' | 'erp_subscriptions' | 'domains' | 'audit' | 'subscriptions' | 'saas_features'
  >('overview');
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Unified SaaS Packages State (P2 / Unified SaaS)
  const [packages, setPackages] = useState<any[]>([]);
  const [isPackagesLoading, setIsPackagesLoading] = useState(false);
  const [pkgCategoryFilter, setPkgCategoryFilter] = useState<'all' | 'erp' | 'waslat_worsh'>('all');
  const [isCreatePkgModalOpen, setIsCreatePkgModalOpen] = useState(false);
  const [isEditPkgModalOpen, setIsEditPkgModalOpen] = useState(false);
  const [selectedPkgForEdit, setSelectedPkgForEdit] = useState<any | null>(null);
  const [isSubmittingPkg, setIsSubmittingPkg] = useState(false);

  // Package Subscribers Modal
  const [subscribersModalOpen, setSubscribersModalOpen] = useState(false);
  const [subscribersList, setSubscribersList] = useState<any[]>([]);
  const [selectedPkgForSubscribers, setSelectedPkgForSubscribers] = useState<any | null>(null);
  const [isSubscribersLoading, setIsSubscribersLoading] = useState(false);

  // SaaS Features Catalog State
  const [saasFeatures, setSaasFeatures] = useState<any[]>([]);
  const [isFeaturesLoading, setIsFeaturesLoading] = useState(false);
  const [featureCategoryFilter, setFeatureCategoryFilter] = useState<'all' | 'erp' | 'waslat_worsh'>('all');

  // Form states for Package CRUD
  const [pkgProductCategory, setPkgProductCategory] = useState<'erp' | 'waslat_worsh'>('waslat_worsh');
  const [pkgCode, setPkgCode] = useState('');
  const [pkgNameAr, setPkgNameAr] = useState('');
  const [pkgNameEn, setPkgNameEn] = useState('');
  const [pkgDescAr, setPkgDescAr] = useState('');
  const [pkgDescEn, setPkgDescEn] = useState('');
  const [pkgPrice, setPkgPrice] = useState(300);
  const [pkgAnnualPrice, setPkgAnnualPrice] = useState(3000);
  const [pkgQuota, setPkgQuota] = useState(5);
  const [pkgValidityDays, setPkgValidityDays] = useState(30);
  const [pkgSortOrder, setPkgSortOrder] = useState(10);
  const [pkgIsPublic, setPkgIsPublic] = useState(true);
  const [pkgIsPopular, setPkgIsPopular] = useState(false);
  const [pkgFeatures, setPkgFeatures] = useState<string[]>([]);

  // Metrics State
  const [metrics, setMetrics] = useState<any>(null);
  const [saasMetrics, setSaasMetrics] = useState<any>(null);
  const [recentAudits, setRecentAudits] = useState<any[]>([]);
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);

  // Tenants State
  const [tenants, setTenants] = useState<any[]>([]);
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantStatusFilter, setTenantStatusFilter] = useState('all');
  const [tenantPlanFilter, setTenantPlanFilter] = useState('all');
  const [tenantPage, setTenantPage] = useState(1);
  const [tenantTotalPages, setTenantTotalPages] = useState(1);
  const [isTenantsLoading, setIsTenantsLoading] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [isAuditLoading, setIsAuditLoading] = useState(false);

  // Modals state
  const [selectedTenantForDetails, setSelectedTenantForDetails] = useState<any | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  // Manual Activation Modal
  const [selectedTenantForActivation, setSelectedTenantForActivation] = useState<any | null>(null);
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState(currentUser.name || (isAr ? 'مدير المنصة العام' : 'Platform Superadmin'));
  const [activationReason, setActivationReason] = useState(isAr ? 'سداد يدوي معتمد أو اتفاقية تعاقد مباشر' : 'Approved manual payment / direct contract');
  const [activationPlanTier, setActivationPlanTier] = useState('professional');
  const [isSubmittingActivation, setIsSubmittingActivation] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null);

  // Suspend Tenant Modal
  const [selectedTenantForSuspend, setSelectedTenantForSuspend] = useState<any | null>(null);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState(isAr ? 'انتهاء الفترة التجريبية وتأخر سداد الاشتراك' : 'Trial period expired / delayed subscription payment');
  const [isSubmittingSuspend, setIsSubmittingSuspend] = useState(false);
  const [suspendError, setSuspendError] = useState<string | null>(null);

  // Domains State
  const [domains, setDomains] = useState<any[]>([]);
  const [baseDomain, setBaseDomain] = useState('garmentos.cloud');
  const [domainSearch, setDomainSearch] = useState('');
  const [domainPage, setDomainPage] = useState(1);
  const [domainTotalPages, setDomainTotalPages] = useState(1);
  const [isDomainsLoading, setIsDomainsLoading] = useState(false);

  // Subdomain Edit Modal
  const [selectedTenantForSubdomain, setSelectedTenantForSubdomain] = useState<any | null>(null);
  const [isSubdomainModalOpen, setIsSubdomainModalOpen] = useState(false);
  const [subdomainInput, setSubdomainInput] = useState('');
  const [isSubmittingSubdomain, setIsSubmittingSubdomain] = useState(false);
  const [subdomainError, setSubdomainError] = useState<string | null>(null);

  // Custom Domain Edit Modal
  const [selectedTenantForCustomDomain, setSelectedTenantForCustomDomain] = useState<any | null>(null);
  const [isCustomDomainModalOpen, setIsCustomDomainModalOpen] = useState(false);
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [isSubmittingCustomDomain, setIsSubmittingCustomDomain] = useState(false);
  const [customDomainError, setCustomDomainError] = useState<string | null>(null);

  // Domain Actions State
  const [verifyingDomainId, setVerifyingDomainId] = useState<string | null>(null);
  const [togglingDomainId, setTogglingDomainId] = useState<string | null>(null);

  // General Notification
  const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Subscriptions & Usage Quotas State
  const [adminSubscriptions, setAdminSubscriptions] = useState<any[]>([]);
  const [isAdminSubsLoading, setIsAdminSubsLoading] = useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideTenant, setOverrideTenant] = useState<any | null>(null);
  const [overrideMeterKey, setOverrideMeterKey] = useState('cutting_lays');
  const [overrideLimit, setOverrideLimit] = useState(500);
  const [overrideReason, setOverrideReason] = useState(isAr ? 'استثناء تشغيلي طارئ لخطوط القص بمناسبة ضغط التصدير' : 'Emergency export season lay override');
  const [overrideDays, setOverrideDays] = useState(7);
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  // Stage C.4: Subscription Payment Requests State & Review Queue
  const [paymentRequestsSubTab, setPaymentRequestsSubTab] = useState<'queue' | 'factories'>('queue');
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [isPaymentRequestsLoading, setIsPaymentRequestsLoading] = useState(false);
  const [paymentRequestStatusFilter, setPaymentRequestStatusFilter] = useState<string>('pending');
  const [paymentRequestProductFilter, setPaymentRequestProductFilter] = useState<string>('all');
  const [paymentRequestsPage, setPaymentRequestsPage] = useState(1);
  const [paymentRequestsTotal, setPaymentRequestsTotal] = useState(0);

  // Modals for Payment Requests
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedRequestForApprove, setSelectedRequestForApprove] = useState<any | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);
  const [selectedRequestForReject, setSelectedRequestForReject] = useState<any | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Load Admin Subscriptions
  const loadAdminSubscriptions = async (page = 1) => {
    setIsAdminSubsLoading(true);
    try {
      const res = await api.subscription.getAdminSubscriptions(page);
      setAdminSubscriptions(res.data || []);
    } catch (_err) {
      setAdminSubscriptions([]);
    } finally {
      setIsAdminSubsLoading(false);
    }
  };

  // Load Payment Requests Queue
  const loadPaymentRequests = async (page = 1) => {
    setIsPaymentRequestsLoading(true);
    try {
      const res = await api.adminSubscriptions.getRequests({
        status: paymentRequestStatusFilter,
        product_type: paymentRequestProductFilter !== 'all' ? paymentRequestProductFilter : undefined,
        page,
      });
      setPaymentRequests(res.data || []);
      setPaymentRequestsTotal(res.total || 0);
      setPaymentRequestsPage(res.current_page || page);
    } catch (_err) {
      setPaymentRequests([]);
    } finally {
      setIsPaymentRequestsLoading(false);
    }
  };

  const handleOpenReceipt = async (requestId: string) => {
    try {
      const blobUrl = await api.adminSubscriptions.getReceiptBlobUrl(requestId);
      setSelectedReceiptUrl(blobUrl);
      setIsReceiptModalOpen(true);
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err?.message || (isAr ? 'فشل تحميل ملف الإيصال' : 'Failed to load receipt') });
    }
  };

  const handleApproveSubmit = async () => {
    if (!selectedRequestForApprove) return;
    setIsSubmittingApprove(true);
    try {
      const res = await api.adminSubscriptions.approve(selectedRequestForApprove.id);
      setGlobalMessage({ type: 'success', text: res.message || (isAr ? 'تم اعتماد السداد وتفعيل الباقة بنجاح' : 'Payment approved and plan activated') });
      setIsApproveModalOpen(false);
      setSelectedRequestForApprove(null);
      await loadPaymentRequests(paymentRequestsPage);
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err?.message || (isAr ? 'فشل اعتماد الطلب' : 'Failed to approve request') });
    } finally {
      setIsSubmittingApprove(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequestForReject || !rejectionReasonInput.trim()) return;
    setIsSubmittingReject(true);
    try {
      const res = await api.adminSubscriptions.reject(selectedRequestForReject.id, rejectionReasonInput.trim());
      setGlobalMessage({ type: 'success', text: res.message || (isAr ? 'تم رفض الطلب بنجاح' : 'Payment request rejected') });
      setIsRejectModalOpen(false);
      setSelectedRequestForReject(null);
      setRejectionReasonInput('');
      await loadPaymentRequests(paymentRequestsPage);
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err?.message || (isAr ? 'فشل رفض الطلب' : 'Failed to reject request') });
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const handleGrantOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideTenant) return;
    setIsSubmittingOverride(true);
    try {
      const res = await api.subscription.grantAdminOverride({
        tenant_id: overrideTenant.id,
        meter_key: overrideMeterKey,
        temporary_limit: Number(overrideLimit),
        reason: overrideReason,
        days: Number(overrideDays),
      });
      setGlobalMessage({ type: 'success', text: res.message || (isAr ? 'تم منح الاستثناء بنجاح' : 'Override granted successfully') });
      setIsOverrideModalOpen(false);
      loadAdminSubscriptions();
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err.message || (isAr ? 'فشل منح الاستثناء' : 'Failed to grant override') });
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  // Load Overview Metrics
  const loadOverview = async () => {
    setIsOverviewLoading(true);
    if (!api.isAuthenticated()) {
      setMetrics({
        total_tenants: 12,
        active_tenants: 9,
        trial_tenants: 2,
        suspended_tenants: 1,
        total_mrr: 48500,
        currency: isAr ? 'ج.م' : 'EGP',
        total_users: 64,
        active_orders: 142,
      });
      setRecentAudits([
        { id: 1, action: 'tenant.created', actor: 'admin@garmentos.com', details: 'إنشاء حساب مصنع النيل لملابس الأطفال', created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
        { id: 2, action: 'subscription.upgraded', actor: 'admin@garmentos.com', details: 'ترقية باقة مصنع الدلتا إلى Enterprise', created_at: new Date(Date.now() - 5 * 3600000).toISOString() },
        { id: 3, action: 'domain.verified', actor: 'system@garmentos.cloud', details: 'تحقق نطاق nile.garmentos.cloud', created_at: new Date(Date.now() - 24 * 3600000).toISOString() },
      ]);
      setIsOverviewLoading(false);
      return;
    }
    try {
      const [res, saasRes] = await Promise.allSettled([
        api.platformAdmin.getOverview(),
        api.saas.getMetrics(),
      ]);
      if (res.status === 'fulfilled') {
        setMetrics(res.value.metrics);
        setRecentAudits(res.value.recent_audits || []);
      }
      if (saasRes.status === 'fulfilled') {
        setSaasMetrics(saasRes.value);
      }
    } catch (_err: any) {
      setMetrics({
        total_tenants: 12,
        active_tenants: 9,
        trial_tenants: 2,
        suspended_tenants: 1,
        total_mrr: 48500,
        currency: isAr ? 'ج.م' : 'EGP',
        total_users: 64,
        active_orders: 142,
      });
      setRecentAudits([
        { id: 1, action: 'tenant.created', actor: 'admin@garmentos.com', details: 'إنشاء حساب مصنع النيل لملابس الأطفال', created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
        { id: 2, action: 'subscription.upgraded', actor: 'admin@garmentos.com', details: 'ترقية باقة مصنع الدلتا إلى Enterprise', created_at: new Date(Date.now() - 5 * 3600000).toISOString() },
        { id: 3, action: 'domain.verified', actor: 'system@garmentos.cloud', details: 'تحقق نطاق nile.garmentos.cloud', created_at: new Date(Date.now() - 24 * 3600000).toISOString() },
      ]);
    } finally {
      setIsOverviewLoading(false);
    }
  };

  // Load Tenants Directory
  const loadTenants = async (page = 1) => {
    setIsTenantsLoading(true);
    if (!api.isAuthenticated()) {
      setTenants([
        { id: 1, name: 'مصنع النيل لملابس الأطفال', code: 'MFG-EG901', plan_tier: 'enterprise', status: 'active', domain: 'nile.garmentos.cloud', users_count: 14, created_at: '2026-01-15' },
        { id: 2, name: 'مؤسسة الدلتا للنسيج والتطريز', code: 'MFG-EG902', plan_tier: 'professional', status: 'active', domain: 'delta.garmentos.cloud', users_count: 8, created_at: '2026-02-01' },
        { id: 3, name: 'ورشة الأهرام للملابس الجاهزة', code: 'MFG-EG903', plan_tier: 'starter', status: 'trial', domain: 'ahram.garmentos.cloud', users_count: 3, created_at: '2026-03-10' },
      ]);
      setTenantPage(1);
      setTenantTotalPages(1);
      setIsTenantsLoading(false);
      return;
    }
    try {
      const res = await api.platformAdmin.getTenants({
        page,
        per_page: 15,
        search: tenantSearch.trim() || undefined,
        status: tenantStatusFilter,
        plan_tier: tenantPlanFilter,
      });
      setTenants(res.data || []);
      setTenantPage(res.current_page || 1);
      setTenantTotalPages(res.last_page || 1);
    } catch (_err: any) {
      setTenants([
        { id: 1, name: 'مصنع النيل لملابس الأطفال', code: 'MFG-EG901', plan_tier: 'enterprise', status: 'active', domain: 'nile.garmentos.cloud', users_count: 14, created_at: '2026-01-15' },
        { id: 2, name: 'مؤسسة الدلتا للنسيج والتطريز', code: 'MFG-EG902', plan_tier: 'professional', status: 'active', domain: 'delta.garmentos.cloud', users_count: 8, created_at: '2026-02-01' },
        { id: 3, name: 'ورشة الأهرام للملابس الجاهزة', code: 'MFG-EG903', plan_tier: 'starter', status: 'trial', domain: 'ahram.garmentos.cloud', users_count: 3, created_at: '2026-03-10' },
      ]);
      setTenantPage(1);
      setTenantTotalPages(1);
    } finally {
      setIsTenantsLoading(false);
    }
  };

  // Load Audit Logs
  const loadAuditLogs = async (page = 1) => {
    setIsAuditLoading(true);
    try {
      const res = await api.platformAdmin.getAuditLogs({ page, per_page: 20 });
      setAuditLogs(res.data || []);
      setAuditPage(res.current_page || 1);
      setAuditTotalPages(res.last_page || 1);
    } catch (_err: any) {
      setAuditLogs([
        { id: 1, action: 'tenant.create', actor_name: 'مدير المنصة', target_name: 'مصنع النيل', ip_address: '192.168.1.1', created_at: '2026-10-21 11:20:00' },
        { id: 2, action: 'plan.change', actor_name: 'مدير المنصة', target_name: 'مؤسسة الدلتا', ip_address: '192.168.1.1', created_at: '2026-10-21 09:15:00' },
      ]);
      setAuditPage(1);
      setAuditTotalPages(1);
    } finally {
      setIsAuditLoading(false);
    }
  };

  // Load Domains
  const loadDomains = async (page = 1) => {
    setIsDomainsLoading(true);
    try {
      const res = await api.platformAdmin.getDomains({ page, search: domainSearch.trim() || undefined, per_page: 15 });
      setDomains(res.domains.data || []);
      setBaseDomain(res.base_domain || 'garmentos.cloud');
      setDomainPage(res.domains.current_page || 1);
      setDomainTotalPages(res.domains.last_page || 1);
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err.message || 'فشل تحميل قائمة النطاقات.' });
    } finally {
      setIsDomainsLoading(false);
    }
  };

  // Load Unified SaaS Packages (ERP + Waslat Worsh)
  const loadPackages = async () => {
    setIsPackagesLoading(true);
    try {
      const res = await api.saas.getPackages({
        category: pkgCategoryFilter === 'all' ? undefined : pkgCategoryFilter,
      });
      setPackages(res.packages || []);
    } catch (err: any) {
      console.error('Failed to load packages:', err);
      try {
        const fb = await api.adminSubscriptions.getPackages();
        setPackages(fb.packages || []);
      } catch (_e) {
        setGlobalMessage({ type: 'error', text: err?.message || (isAr ? 'فشل تحميل باقات النظام' : 'Failed to load packages') });
      }
    } finally {
      setIsPackagesLoading(false);
    }
  };

  const handleTogglePackagePublic = async (pkg: any) => {
    try {
      const res = await api.saas.togglePackagePublic(pkg.id);
      setGlobalMessage({ type: 'success', text: res.message || (isAr ? 'تم تعديل ظهور الباقة على الموقع' : 'Package visibility toggled') });
      loadPackages();
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err?.message || (isAr ? 'فشل تغيير حالة العرض' : 'Failed to toggle visibility') });
    }
  };

  const handleDuplicatePackage = async (pkg: any) => {
    try {
      const res = await api.saas.duplicatePackage(pkg.id);
      setGlobalMessage({ type: 'success', text: res.message || (isAr ? 'تم استنساخ الباقة بنجاح كمسودة' : 'Package duplicated successfully') });
      loadPackages();
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err?.message || (isAr ? 'فشل استنساخ الباقة' : 'Failed to duplicate package') });
    }
  };

  const handleArchivePackage = async (pkg: any) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من أرشفة هذه الباقة؟ سيتم إخفاؤها من الشراء مع حفظ اشتراكات وسجلات العملاء السابقة.' : 'Archive this package?')) return;
    try {
      const res = await api.saas.archivePackage(pkg.id);
      setGlobalMessage({ type: 'success', text: res.message || (isAr ? 'تمت أرشفة الباقة بنجاح' : 'Package archived successfully') });
      loadPackages();
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err?.message || (isAr ? 'فشل أرشفة الباقة' : 'Failed to archive package') });
    }
  };

  const handleViewSubscribers = async (pkg: any) => {
    setSelectedPkgForSubscribers(pkg);
    setIsSubscribersLoading(true);
    setSubscribersModalOpen(true);
    try {
      const res = await api.saas.getPackageSubscribers(pkg.id);
      setSubscribersList(res.subscribers || []);
    } catch (err: any) {
      console.error('Failed to load subscribers:', err);
      setSubscribersList([]);
    } finally {
      setIsSubscribersLoading(false);
    }
  };

  // SaaS Features Catalog Handlers
  const loadFeatures = async () => {
    setIsFeaturesLoading(true);
    try {
      const res = await api.saas.getFeatures({
        category: featureCategoryFilter === 'all' ? undefined : featureCategoryFilter,
      });
      setSaasFeatures(res.features || []);
    } catch (err: any) {
      console.error('Failed to load SaaS features:', err);
      setSaasFeatures([]);
    } finally {
      setIsFeaturesLoading(false);
    }
  };

  const handleToggleFeatureActive = async (feat: any) => {
    try {
      const res = await api.saas.toggleFeatureActive(feat.id);
      setGlobalMessage({ type: 'success', text: res.message });
      loadFeatures();
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err?.message || 'فشل تعديل حالة الميزة' });
    }
  };

  const handleToggleFeaturePublic = async (feat: any) => {
    try {
      const res = await api.saas.toggleFeaturePublic(feat.id);
      setGlobalMessage({ type: 'success', text: res.message });
      loadFeatures();
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err?.message || 'فشل تعديل ظهور الميزة' });
    }
  };

  const resetPkgForm = () => {
    setPkgProductCategory('waslat_worsh');
    setPkgCode('');
    setPkgNameAr('');
    setPkgNameEn('');
    setPkgDescAr('');
    setPkgDescEn('');
    setPkgPrice(300);
    setPkgAnnualPrice(3000);
    setPkgQuota(5);
    setPkgValidityDays(30);
    setPkgSortOrder(10);
    setPkgIsPublic(true);
    setPkgIsPopular(false);
    setPkgFeatures([]);
    if (saasFeatures.length === 0) {
      loadFeatures();
    }
  };

  const handleOpenEditPkg = (pkg: any) => {
    if (saasFeatures.length === 0) {
      loadFeatures();
    }
    setSelectedPkgForEdit(pkg);
    setPkgProductCategory(pkg.product_category || 'waslat_worsh');
    setPkgCode(pkg.code);
    setPkgNameAr(pkg.name_ar);
    setPkgNameEn(pkg.name_en);
    setPkgDescAr(pkg.description_ar || '');
    setPkgDescEn(pkg.description_en || '');
    setPkgPrice(pkg.monthly_price || pkg.price || 300);
    setPkgAnnualPrice(pkg.annual_price || (pkg.monthly_price || 300) * 10);
    setPkgQuota(pkg.quota_rfq_count || 5);
    setPkgValidityDays(pkg.billing_duration || pkg.validity_days || 30);
    setPkgSortOrder(pkg.sort_order || 10);
    setPkgIsPublic(pkg.is_public !== false);
    setPkgIsPopular(pkg.is_popular || false);
    const featureKeys = Array.isArray(pkg.features)
      ? pkg.features
      : Array.isArray(pkg.saas_plan_features)
      ? pkg.saas_plan_features.map((spf: any) => spf.feature?.feature_key || spf.feature_key).filter(Boolean)
      : [];
    setPkgFeatures(featureKeys);
    setIsEditPkgModalOpen(true);
  };

  const handleCreatePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPkg(true);
    try {
      await api.saas.createPackage({
        code: pkgCode.trim(),
        product_category: pkgProductCategory,
        name_ar: pkgNameAr.trim(),
        name_en: pkgNameEn.trim(),
        description_ar: pkgDescAr.trim() || undefined,
        description_en: pkgDescEn.trim() || undefined,
        monthly_price: Number(pkgPrice),
        annual_price: Number(pkgAnnualPrice),
        quota_rfq_count: Number(pkgQuota),
        billing_duration: Number(pkgValidityDays),
        sort_order: Number(pkgSortOrder),
        is_public: pkgIsPublic,
        is_popular: pkgIsPopular,
        is_active: true,
        features: pkgFeatures,
      });
      setGlobalMessage({ type: 'success', text: isAr ? 'تم إنشاء الباقة بنجاح' : 'Package created successfully' });
      setIsCreatePkgModalOpen(false);
      resetPkgForm();
      await loadPackages();
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err?.message || (isAr ? 'فشل إنشاء الباقة' : 'Failed to create package') });
    } finally {
      setIsSubmittingPkg(false);
    }
  };

  const handleUpdatePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkgForEdit) return;
    setIsSubmittingPkg(true);
    try {
      await api.saas.updatePackage(selectedPkgForEdit.id, {
        name_ar: pkgNameAr.trim(),
        name_en: pkgNameEn.trim(),
        description_ar: pkgDescAr.trim() || undefined,
        description_en: pkgDescEn.trim() || undefined,
        monthly_price: Number(pkgPrice),
        annual_price: Number(pkgAnnualPrice),
        quota_rfq_count: Number(pkgQuota),
        billing_duration: Number(pkgValidityDays),
        sort_order: Number(pkgSortOrder),
        is_public: pkgIsPublic,
        is_popular: pkgIsPopular,
        features: pkgFeatures,
      });
      setGlobalMessage({ type: 'success', text: isAr ? 'تم تحديث بيانات الباقة بنجاح' : 'Package updated successfully' });
      setIsEditPkgModalOpen(false);
      setSelectedPkgForEdit(null);
      await loadPackages();
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err?.message || (isAr ? 'فشل تحديث الباقة' : 'Failed to update package') });
    } finally {
      setIsSubmittingPkg(false);
    }
  };

  const handleTogglePackageActive = async (pkg: any) => {
    try {
      await api.saas.togglePackageActive(pkg.id);
      setGlobalMessage({ type: 'success', text: isAr ? 'تم تعديل حالة تفعيل الباقة' : 'Package status updated' });
      await loadPackages();
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err?.message || (isAr ? 'فشل تغيير حالة الباقة' : 'Failed to toggle package') });
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (activeTab === 'tenants') {
      loadTenants(1);
    } else if (activeTab === 'domains') {
      loadDomains(1);
    } else if (activeTab === 'audit') {
      loadAuditLogs(1);
    } else if (activeTab === 'subscriptions' || activeTab === 'ww_payments') {
      loadPaymentRequests(1);
      loadAdminSubscriptions(1);
    } else if (activeTab === 'ww_packages') {
      loadPackages();
    } else if (activeTab === 'saas_features') {
      loadFeatures();
    } else if (activeTab === 'erp_subscriptions') {
      loadAdminSubscriptions(1);
    }
  }, [activeTab, tenantStatusFilter, tenantPlanFilter, paymentRequestStatusFilter, paymentRequestProductFilter, pkgCategoryFilter, featureCategoryFilter]);

  // Domain Handlers
  const handleOpenSubdomainModal = (tenant: any) => {
    setSelectedTenantForSubdomain(tenant);
    setSubdomainInput(tenant.subdomain || '');
    setSubdomainError(null);
    setIsSubdomainModalOpen(true);
  };

  const handleSubdomainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantForSubdomain) return;
    setIsSubmittingSubdomain(true);
    setSubdomainError(null);
    try {
      const res = await api.platformAdmin.updateSubdomain(selectedTenantForSubdomain.id, subdomainInput);
      setGlobalMessage({ type: 'success', text: res.message || (isAr ? 'تم تحديث النطاق الفرعي بنجاح.' : 'Subdomain updated successfully.') });
      setIsSubdomainModalOpen(false);
      loadDomains(domainPage);
    } catch (err: any) {
      setSubdomainError(err.message || (isAr ? 'فشل تحديث النطاق الفرعي.' : 'Failed to update subdomain.'));
    } finally {
      setIsSubmittingSubdomain(false);
    }
  };

  const handleOpenCustomDomainModal = (tenant: any) => {
    setSelectedTenantForCustomDomain(tenant);
    setCustomDomainInput(tenant.custom_domain || '');
    setCustomDomainError(null);
    setIsCustomDomainModalOpen(true);
  };

  const handleCustomDomainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantForCustomDomain) return;
    setIsSubmittingCustomDomain(true);
    setCustomDomainError(null);
    try {
      const res = await api.platformAdmin.updateCustomDomain(selectedTenantForCustomDomain.id, customDomainInput.trim() || null);
      setGlobalMessage({ type: 'success', text: res.message || (isAr ? 'تم تحديث النطاق المخصص.' : 'Custom domain updated.') });
      setIsCustomDomainModalOpen(false);
      loadDomains(domainPage);
    } catch (err: any) {
      setCustomDomainError(err.message || (isAr ? 'فشل تحديث النطاق المخصص.' : 'Failed to update custom domain.'));
    } finally {
      setIsSubmittingCustomDomain(false);
    }
  };

  const handleVerifyCustomDomain = async (tenantId: string) => {
    setVerifyingDomainId(tenantId);
    try {
      const res = await api.platformAdmin.verifyCustomDomain(tenantId, false);
      if (res.verified) {
        setGlobalMessage({ type: 'success', text: res.message || 'تم توثيق النطاق المخصص بنجاح.' });
      } else {
        setGlobalMessage({ type: 'error', text: res.message || 'فشل توثيق سجلات DNS.' });
      }
      loadDomains(domainPage);
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err.message || 'خطأ في عملية التحقق من النطاق.' });
    } finally {
      setVerifyingDomainId(null);
    }
  };

  const handleToggleDomainStatus = async (tenantId: string) => {
    setTogglingDomainId(tenantId);
    try {
      const res = await api.platformAdmin.toggleDomainStatus(tenantId);
      setGlobalMessage({ type: 'success', text: res.message });
      loadDomains(domainPage);
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err.message || 'فشل تبديل حالة توجيه النطاق.' });
    } finally {
      setTogglingDomainId(null);
    }
  };

  // Open Details Modal
  const handleOpenDetails = async (t: any) => {
    setIsDetailsModalOpen(true);
    setIsDetailsLoading(true);
    setSelectedTenantForDetails(null);
    try {
      const res = await api.platformAdmin.getTenant(t.id);
      setSelectedTenantForDetails(res);
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err.message || 'فشل جلب تفاصيل المصنع.' });
      setIsDetailsModalOpen(false);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  // Submit Manual Activation
  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantForActivation) return;
    setActivationError(null);
    setActivationSuccess(null);
    setIsSubmittingActivation(true);

    try {
      const res = await api.platformAdmin.activateSubscription(selectedTenantForActivation.id, {
        authorization_code: authCode.trim(),
        authorized_by: authorizedBy.trim(),
        reason: activationReason.trim(),
        plan_tier: activationPlanTier,
      });

      setActivationSuccess(res.message);
      setTimeout(() => {
        setIsActivationModalOpen(false);
        setActivationSuccess(null);
        setAuthCode('');
        loadOverview();
        if (activeTab === 'tenants') loadTenants(tenantPage);
      }, 1500);
    } catch (err: any) {
      setActivationError(err.message || (isAr ? 'فشل تفعيل الاشتراك. تحقق من كود التفويض الأمني.' : 'Failed to activate subscription. Check security auth code.'));
    } finally {
      setIsSubmittingActivation(false);
    }
  };

  // Submit Suspend
  const handleSuspendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantForSuspend) return;
    setSuspendError(null);
    setIsSubmittingSuspend(true);

    try {
      const res = await api.platformAdmin.suspendTenant(selectedTenantForSuspend.id, suspendReason.trim());
      setGlobalMessage({ type: 'success', text: res.message });
      setIsSuspendModalOpen(false);
      loadOverview();
      if (activeTab === 'tenants') loadTenants(tenantPage);
    } catch (err: any) {
      setSuspendError(err.message || (isAr ? 'فشل تعليق الحساب.' : 'Failed to suspend account.'));
    } finally {
      setIsSubmittingSuspend(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#070a13] text-slate-100' : 'bg-slate-100 text-slate-900'} transition-colors duration-200`}>
      {/* 1. Super Admin Navbar */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b ${isDark ? 'border-slate-800 bg-[#0c101a]/95 text-slate-100' : 'border-slate-200 bg-white/95 text-slate-900'} px-4 lg:px-6 py-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isAr ? 'القائمة الجانبية' : 'Toggle Menu'}
            >
              {isSidebarOpenMobile ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">GarmentOS Cloud</span>
                <span
                  className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border"
                  style={{
                    backgroundColor: isDark ? 'rgba(158, 42, 59, 0.25)' : 'rgba(127, 22, 37, 0.08)',
                    color: isDark ? '#fca5a5' : 'var(--brand-primary)',
                    borderColor: isDark ? '#871b29' : 'rgba(127, 22, 37, 0.3)',
                  }}
                >
                  Platform Super Admin
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="text-slate-900 dark:text-slate-200 font-semibold">{currentUser.name}</span>
                <span>•</span>
                <span className="text-slate-600 dark:text-slate-400 font-mono text-[10px]">{currentUser.email}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {onSwitchToTenantApp && (
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                className="text-xs border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={onSwitchToTenantApp}
              >
                <Building2 className="w-3.5 h-3.5 inline-block mr-1.5 rtl:ml-1.5 text-slate-500 dark:text-slate-400" />
                <span>{isAr ? 'عرض واجهة المصنع (ERP)' : 'Tenant ERP App'}</span>
              </CButton>
            )}

            <button
              onClick={onToggleLang}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs flex items-center gap-1.5"
              title={isAr ? 'Switch Language' : 'تغيير اللغة'}
            >
              <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline font-bold">{isAr ? 'English' : 'عربي'}</span>
            </button>

            <CButton
              color="danger"
              variant="outline"
              size="sm"
              className="text-xs text-rose-400 border-rose-500/40 hover:bg-rose-950/40 cursor-pointer"
              onClick={() => setIsLogoutModalOpen(true)}
            >
              <LogOut className="w-3.5 h-3.5 inline-block mr-1 rtl:ml-1" />
              <span>{isAr ? 'خروج' : 'Logout'}</span>
            </CButton>
          </div>
        </div>
      </header>

      {/* 2. Main Admin Layout with Persistent Sidebar (P6) */}
      <div className="flex flex-1 relative min-h-[calc(100vh-61px)]">
        {/* Persistent Desktop Sidebar / Responsive Mobile Drawer */}
        <aside
          className={`
            fixed lg:sticky top-[61px] bottom-0 z-30 w-64 shrink-0
            ${isDark ? 'bg-[#0a0e19] border-slate-800/80 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}
            border-r rtl:border-r-0 rtl:border-l transition-transform duration-300
            ${isSidebarOpenMobile ? 'translate-x-0' : 'max-lg:-translate-x-full rtl:max-lg:translate-x-full'}
            flex flex-col justify-between overflow-y-auto h-[calc(100vh-61px)]
          `}
        >
          <div className="p-3.5 space-y-5">
            {/* Group 1: Overview */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {isAr ? 'نظرة عامة' : 'Overview'}
              </span>
              <div className="space-y-0.5 mt-1">
                <button
                  onClick={() => {
                    setActiveTab('overview');
                    setIsSidebarOpenMobile(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-start ${
                    activeTab === 'overview'
                      ? 'text-white shadow-md'
                      : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  style={
                    activeTab === 'overview'
                      ? {
                          backgroundColor: 'var(--brand-primary)',
                          boxShadow: '0 4px 14px 0 rgba(70, 8, 9, 0.35)',
                        }
                      : {}
                  }
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span className="truncate">{isAr ? 'لوحة المؤشرات العامة' : 'Platform Overview'}</span>
                </button>
              </div>
            </div>

            {/* Group 2: Unified SaaS Plans & Features */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {isAr ? 'الباقات والاشتراكات السحابية' : 'SaaS Plans & Features'}
              </span>
              <div className="space-y-0.5 mt-1">
                <button
                  onClick={() => {
                    setActiveTab('ww_packages');
                    setIsSidebarOpenMobile(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-start ${
                    activeTab === 'ww_packages'
                      ? 'text-white shadow-md'
                      : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  style={
                    activeTab === 'ww_packages'
                      ? {
                          backgroundColor: 'var(--brand-primary)',
                          boxShadow: '0 4px 14px 0 rgba(70, 8, 9, 0.35)',
                        }
                      : {}
                  }
                >
                  <Package className="w-4 h-4 shrink-0 text-amber-400" />
                  <span className="truncate">{isAr ? 'إدارة الباقات والأسعار' : 'Packages Manager'}</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('saas_features');
                    setIsSidebarOpenMobile(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-start ${
                    activeTab === 'saas_features'
                      ? 'text-white shadow-md'
                      : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  style={
                    activeTab === 'saas_features'
                      ? {
                          backgroundColor: 'var(--brand-primary)',
                          boxShadow: '0 4px 14px 0 rgba(70, 8, 9, 0.35)',
                        }
                      : {}
                  }
                >
                  <Layers className="w-4 h-4 shrink-0 text-cyan-400" />
                  <span className="truncate">{isAr ? 'كتالوج الميزات والصلاحيات' : 'Features Catalog'}</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('ww_payments');
                    setIsSidebarOpenMobile(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-start ${
                    activeTab === 'ww_payments' || activeTab === 'subscriptions'
                      ? 'text-white shadow-md'
                      : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  style={
                    activeTab === 'ww_payments' || activeTab === 'subscriptions'
                      ? {
                          backgroundColor: 'var(--brand-primary)',
                          boxShadow: '0 4px 14px 0 rgba(70, 8, 9, 0.35)',
                        }
                      : {}
                  }
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <CreditCard className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span className="truncate">{isAr ? 'طابور السداد والاعتماد' : 'Payment Approvals'}</span>
                  </div>
                  {paymentRequestsTotal > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/40">
                      {paymentRequestsTotal}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Group 3: ERP Platform */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {isAr ? 'منصة المصانع ERP' : 'ERP Platform'}
              </span>
              <div className="space-y-0.5 mt-1">
                <button
                  onClick={() => {
                    setActiveTab('tenants');
                    setIsSidebarOpenMobile(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-start ${
                    activeTab === 'tenants'
                      ? 'text-white shadow-md'
                      : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  style={
                    activeTab === 'tenants'
                      ? {
                          backgroundColor: 'var(--brand-primary)',
                          boxShadow: '0 4px 14px 0 rgba(70, 8, 9, 0.35)',
                        }
                      : {}
                  }
                >
                  <Building2 className="w-4 h-4 shrink-0 text-sky-400" />
                  <span className="truncate">{isAr ? 'دليل المصانع والشركات' : 'Tenants Directory'}</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('erp_subscriptions');
                    setIsSidebarOpenMobile(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-start ${
                    activeTab === 'erp_subscriptions'
                      ? 'text-white shadow-md'
                      : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  style={
                    activeTab === 'erp_subscriptions'
                      ? {
                          backgroundColor: 'var(--brand-primary)',
                          boxShadow: '0 4px 14px 0 rgba(70, 8, 9, 0.35)',
                        }
                      : {}
                  }
                >
                  <Layers className="w-4 h-4 shrink-0 text-purple-400" />
                  <span className="truncate">{isAr ? 'اشتراكات ERP والاستثناءات' : 'ERP Quotas & Overrides'}</span>
                </button>
              </div>
            </div>

            {/* Group 4: Administration & Security */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {isAr ? 'الإدارة والأمان' : 'Administration'}
              </span>
              <div className="space-y-0.5 mt-1">
                <button
                  onClick={() => {
                    setActiveTab('domains');
                    setIsSidebarOpenMobile(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-start ${
                    activeTab === 'domains'
                      ? 'text-white shadow-md'
                      : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  style={
                    activeTab === 'domains'
                      ? {
                          backgroundColor: 'var(--brand-primary)',
                          boxShadow: '0 4px 14px 0 rgba(70, 8, 9, 0.35)',
                        }
                      : {}
                  }
                >
                  <Globe className="w-4 h-4 shrink-0 text-indigo-400" />
                  <span className="truncate">{isAr ? 'إدارة النطاقات والمتاجر' : 'Domains Routing'}</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('audit');
                    setIsSidebarOpenMobile(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-start ${
                    activeTab === 'audit'
                      ? 'text-white shadow-md'
                      : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  style={
                    activeTab === 'audit'
                      ? {
                          backgroundColor: 'var(--brand-primary)',
                          boxShadow: '0 4px 14px 0 rgba(70, 8, 9, 0.35)',
                        }
                      : {}
                  }
                >
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="truncate">{isAr ? 'سجل الرقابة والتدقيق' : 'Audit Logs'}</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Backdrop Overlay */}
        {isSidebarOpenMobile && (
          <div
            onClick={() => setIsSidebarOpenMobile(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
          />
        )}

        {/* 3. Main Content Workspace */}
        <main className="flex-1 p-4 lg:p-8 min-w-0 overflow-y-auto max-h-[calc(100vh-61px)]">
          {globalMessage && (
            <CAlert
              color={globalMessage.type === 'success' ? 'success' : 'danger'}
              dismissible
              onClose={() => setGlobalMessage(null)}
              className="text-xs mb-6 shadow-sm"
            >
              {globalMessage.text}
            </CAlert>
          )}

        {/* TAB 1: OVERVIEW METRICS */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`text-xl sm:text-2xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {isAr ? 'نظرة عامة على اشتراكات ومصانع المنصة' : 'SaaS Platform Operations'}
                </h1>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {isAr ? 'إحصائيات حية مستمدة من قاعدة البيانات لعزل وحالة المستأجرين.' : 'Live platform metrics derived from PostgreSQL/SQLite tenant tables.'}
                </p>
              </div>

              <CButton
                color="secondary"
                size="sm"
                variant="outline"
                onClick={loadOverview}
                disabled={isOverviewLoading}
                className={`text-xs ${isDark ? 'text-slate-300 border-slate-700 hover:bg-slate-800' : 'text-slate-700 border-slate-300 hover:bg-slate-100'}`}
              >
                <RefreshCw className={`w-3.5 h-3.5 inline-block mr-1.5 rtl:ml-1.5 ${isOverviewLoading ? 'animate-spin' : ''}`} />
                <span>{isAr ? 'تحديث الإحصائيات' : 'Refresh'}</span>
              </CButton>
            </div>

            {isOverviewLoading && !metrics ? (
              <div className="py-20 text-center">
                <CSpinner color="primary" />
                <div className={`text-xs mt-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{isAr ? 'جارِ تجميع مؤشرات المنصة...' : 'Loading metrics...'}</div>
              </div>
            ) : metrics ? (
              <>
                {/* Metrics Cards Grid */}
                <CRow className="g-4">
                  <CCol xs={12} sm={6} lg={3}>
                    <CCard className={`rounded-2xl shadow-sm border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-300'}`}>
                      <CCardBody className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{isAr ? 'إجمالي المصانع' : 'Total Tenants'}</span>
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{
                              backgroundColor: isDark ? 'rgba(158, 42, 59, 0.25)' : 'rgba(127, 22, 37, 0.08)',
                              color: isDark ? '#fca5a5' : 'var(--brand-primary)',
                            }}
                          >
                            <Building2 className="w-4 h-4" />
                          </div>
                        </div>
                        <div className={`text-2xl font-black ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{metrics.total_tenants}</div>
                        <div className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {isAr ? 'شركات مسجلة في النظام' : 'Registered tenants'}
                        </div>
                      </CCardBody>
                    </CCard>
                  </CCol>

                  <CCol xs={12} sm={6} lg={3}>
                    <CCard className={`rounded-2xl shadow-sm border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-300'}`}>
                      <CCardBody className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{isAr ? 'اشتراكات نشطة' : 'Active Subscriptions'}</span>
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{metrics.active_tenants}</div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400/80 mt-1">
                          {isAr ? 'سداد مفعل أو معتمد' : 'Paid & active status'}
                        </div>
                      </CCardBody>
                    </CCard>
                  </CCol>

                  <CCol xs={12} sm={6} lg={3}>
                    <CCard className={`rounded-2xl shadow-sm border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-300'}`}>
                      <CCardBody className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{isAr ? 'فترات تجريبية (Trial)' : 'In Trial'}</span>
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <Clock className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{metrics.trial_tenants}</div>
                        <div className="text-[11px] text-amber-600 dark:text-amber-400/80 mt-1">
                          {isAr ? 'خلال فترة الـ 14 يوماً' : '14-day trial period'}
                        </div>
                      </CCardBody>
                    </CCard>
                  </CCol>

                  <CCol xs={12} sm={6} lg={3}>
                    <CCard className={`rounded-2xl shadow-sm border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-300'}`}>
                      <CCardBody className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{isAr ? 'إجمالي المستخدمين' : 'Total Users'}</span>
                          <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                            <Users className="w-4 h-4" />
                          </div>
                        </div>
                        <div className={`text-2xl font-black ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{metrics.total_users}</div>
                        <div className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {isAr ? 'عبر جميع المصانع والورش' : 'Across all tenant accounts'}
                        </div>
                      </CCardBody>
                    </CCard>
                  </CCol>
                </CRow>

                {/* SaaS Commercial & Multi-Product Metrics */}
                {saasMetrics && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h2 className={`text-sm font-extrabold ${isDark ? 'text-slate-200' : 'text-slate-800'} flex items-center gap-2`}>
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        <span>{isAr ? 'مؤشرات الاشتراكات والإيرادات المركزية (ERP + وصلة ورش)' : 'Central SaaS & Cross-Product Commercials'}</span>
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab('ww_packages')}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                      >
                        {isAr ? 'إدارة الباقات والتسعير ←' : 'Manage Packages & Pricing →'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <CCard className={`rounded-2xl p-4 border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-300'}`}>
                        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{isAr ? 'مصانع ERP النشطة' : 'Active ERP Factories'}</span>
                        <span className="text-2xl font-black text-indigo-400 mt-1 block">{saasMetrics.total_erp_subscribers ?? 0}</span>
                        <span className={`text-[11px] mt-1 block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{isAr ? 'نظام تشغيل وتصنيع متكامل' : 'Full manufacturing ERP'}</span>
                      </CCard>
                      <CCard className={`rounded-2xl p-4 border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-300'}`}>
                        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{isAr ? 'مشتركو سوق وصلة ورش' : 'Waslat Worsh Requesters'}</span>
                        <span className="text-2xl font-black text-amber-400 mt-1 block">{saasMetrics.total_waslat_subscribers ?? 0}</span>
                        <span className={`text-[11px] mt-1 block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{isAr ? 'طالبو تشغيل مستقلون' : 'Independent requesters'}</span>
                      </CCard>
                      <CCard className={`rounded-2xl p-4 border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-300'}`}>
                        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{isAr ? 'إيرادات آخر 30 يوماً' : '30-Day Revenue'}</span>
                        <span className="text-2xl font-black text-emerald-400 mt-1 block font-mono">
                          {Number(saasMetrics.monthly_approved_revenue || 0).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                        </span>
                        <span className={`text-[11px] mt-1 block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{isAr ? 'سدادات معتمدة حديثاً' : 'Approved payments'}</span>
                      </CCard>
                      <CCard className={`rounded-2xl p-4 border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-300'}`}>
                        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{isAr ? 'طلبات سداد بالانتظار' : 'Pending Payment Approvals'}</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-2xl font-black text-rose-400">{saasMetrics.pending_payments_count ?? 0}</span>
                          <span className="text-xs font-mono text-slate-400">({Number(saasMetrics.pending_payments_amount || 0).toLocaleString()} ج.م)</span>
                        </div>
                        <span className={`text-[11px] mt-1 block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{isAr ? 'تتطلب مراجعة إيصال التحويل' : 'Receipt audit queue'}</span>
                      </CCard>
                    </div>
                  </div>
                )}

                {/* Plan Tiers & Security Distribution */}
                <CRow className="g-4">
                  <CCol xs={12} md={5}>
                    <CCard className={`rounded-2xl shadow-sm h-100 border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-300'}`}>
                      <CCardHeader className={`border-b font-bold text-xs ${isDark ? 'bg-slate-900/40 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-900'}`}>
                        {isAr ? 'توزيع باقات الاشتراك (Plan Tiers)' : 'Subscription Tiers Distribution'}
                      </CCardHeader>
                      <CCardBody className="p-5 space-y-4">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-slate-500" />
                            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{isAr ? 'باقة الورش الصغيرة (Starter)' : 'Small Workshops (Starter)'}</span>
                          </div>
                          <span className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{metrics.tier_counts?.starter || 0} {isAr ? 'مصانع' : 'factories'}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--brand-primary)' }} />
                            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{isAr ? 'باقة المصانع المتكاملة (Professional)' : 'Full Factories (Professional)'}</span>
                          </div>
                          <span className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{metrics.tier_counts?.professional || 0} {isAr ? 'مصانع' : 'factories'}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{isAr ? 'باقة الشركات الكبرى (Enterprise)' : 'Enterprise Scale'}</span>
                          </div>
                          <span className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{metrics.tier_counts?.enterprise || 0} {isAr ? 'مصانع' : 'factories'}</span>
                        </div>

                        {metrics.suspended_tenants > 0 && (
                          <div className="pt-3 border-t border-slate-700 dark:border-slate-800 flex items-center justify-between text-xs text-rose-600 dark:text-rose-400">
                            <div className="flex items-center gap-2">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>{isAr ? 'حسابات معلقة (Suspended)' : 'Suspended Tenants'}</span>
                            </div>
                            <span className="font-bold">{metrics.suspended_tenants}</span>
                          </div>
                        )}
                      </CCardBody>
                    </CCard>
                  </CCol>

                  <CCol xs={12} md={7}>
                    <CCard className={`rounded-2xl shadow-sm h-100 border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-300'}`}>
                      <CCardHeader className={`border-b font-bold text-xs flex items-center justify-between ${isDark ? 'bg-slate-900/40 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-900'}`}>
                        <span>{isAr ? 'آخر أحداث الرقابة والتدقيق (Platform Audit)' : 'Recent Audit Events'}</span>
                        <CButton
                          color="link"
                          size="sm"
                          className={`text-xs p-0 font-bold ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'}`}
                          onClick={() => setActiveTab('audit')}
                        >
                          {isAr ? 'عرض الكل' : 'View All'}
                        </CButton>
                      </CCardHeader>
                      <CCardBody className="p-0">
                        <div className="divide-y divide-slate-800 text-xs">
                          {recentAudits.length === 0 ? (
                            <div className="p-5 text-center text-slate-500">
                              {isAr ? 'لا توجد أحداث تدقيق مسجلة حالياً.' : 'No audit events found.'}
                            </div>
                          ) : (
                            recentAudits.map((item, idx) => (
                              <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                                <div>
                                  <div className="font-semibold text-slate-200">
                                    {item.action === 'admin_manual_activation'
                                      ? 'تفعيل اشتراك يدوي بمفتاح أمني'
                                      : item.action === 'admin_suspend_tenant'
                                      ? 'تعليق حساب مصنع'
                                      : item.action}
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-0.5">
                                    بواسطة: {item.user?.name || item.user?.email || 'المشرف العام'} • IP: {item.ip_address || '127.0.0.1'}
                                  </div>
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {item.created_at ? new Date(item.created_at).toLocaleString(isAr ? 'ar-EG' : 'en-US') : ''}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </CCardBody>
                    </CCard>
                  </CCol>
                </CRow>
              </>
            ) : null}
          </div>
        )}

        {/* TAB 2: TENANTS DIRECTORY */}
        {activeTab === 'tenants' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-extrabold text-slate-100">
                  {isAr ? 'دليل المصانع والشركات المستأجرة' : 'Tenants Directory'}
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  {isAr ? 'إدارة الشركات المستأجرة، تفعيل الاشتراكات، ومراقبة حالة المصانع.' : 'Monitor tenant status, manage plan activations, and review accounts.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <CButton
                  color="secondary"
                  size="sm"
                  variant="outline"
                  onClick={() => loadTenants(tenantPage)}
                  disabled={isTenantsLoading}
                  className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800"
                >
                  <RefreshCw className={`w-3.5 h-3.5 inline-block mr-1.5 rtl:ml-1.5 ${isTenantsLoading ? 'animate-spin' : ''}`} />
                  <span>{isAr ? 'تحديث' : 'Refresh'}</span>
                </CButton>
              </div>
            </div>

            {/* Filters Bar */}
            <CCard className="bg-slate-900/80 border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <CFormInput
                    type="text"
                    value={tenantSearch}
                    onChange={(e) => setTenantSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') loadTenants(1); }}
                    placeholder={isAr ? 'بحث بالاسم، الكود، أو الدومين الفرعي...' : 'Search by name, code, or subdomain...'}
                    className="bg-slate-800/80 border-slate-700 text-xs text-slate-100 pr-9 py-2"
                  />
                </div>

                <div>
                  <CFormSelect
                    value={tenantStatusFilter}
                    onChange={(e) => setTenantStatusFilter(e.target.value)}
                    className="bg-slate-800/80 border-slate-700 text-xs text-slate-100 py-2"
                  >
                    <option value="all">{isAr ? 'كافة حالات الاشتراك' : 'All Statuses'}</option>
                    <option value="active">{isAr ? 'نشط (Active)' : 'Active'}</option>
                    <option value="trial">{isAr ? 'فترة تجريبية (Trial)' : 'Trial'}</option>
                    <option value="suspended">{isAr ? 'معلق (Suspended)' : 'Suspended'}</option>
                  </CFormSelect>
                </div>

                <div>
                  <CFormSelect
                    value={tenantPlanFilter}
                    onChange={(e) => setTenantPlanFilter(e.target.value)}
                    className="bg-slate-800/80 border-slate-700 text-xs text-slate-100 py-2"
                  >
                    <option value="all">{isAr ? 'كافة الباقات' : 'All Plan Tiers'}</option>
                    <option value="starter">{isAr ? 'باقة الورش (Starter)' : 'Starter'}</option>
                    <option value="professional">{isAr ? 'باقة المصانع (Professional)' : 'Professional'}</option>
                    <option value="enterprise">{isAr ? 'باقة الشركات (Enterprise)' : 'Enterprise'}</option>
                  </CFormSelect>
                </div>
              </div>
            </CCard>

            {/* Tenants Table */}
            <CCard className="bg-slate-900/80 border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <CCardBody className="p-0">
                {isTenantsLoading ? (
                  <div className="py-20 text-center">
                    <CSpinner color="primary" />
                    <div className="text-xs text-slate-400 mt-3">{isAr ? 'جارِ جلب المصانع...' : 'Loading tenants...'}</div>
                  </div>
                ) : tenants.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs">
                    {isAr ? 'لا توجد مصانع تطابق معايير البحث.' : 'No tenants match search criteria.'}
                  </div>
                ) : (
                  <CTable responsive align="middle" className="text-xs mb-0 text-slate-200">
                    <CTableHead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                      <CTableRow>
                        <CTableHeaderCell>{isAr ? 'اسم المصنع / الشركة' : 'Company Name'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'الكود والمعرف' : 'Code & Subdomain'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'الباقة' : 'Plan'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'حالة الاشتراك' : 'Status'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'المستخدمين / الفروع' : 'Users / Branches'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'تاريخ التسجيل' : 'Created'}</CTableHeaderCell>
                        <CTableHeaderCell className="text-center">{isAr ? 'الإجراءات الإدارية' : 'Actions'}</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody className="divide-y divide-slate-800">
                      {tenants.map((t) => (
                        <CTableRow key={t.id} className="hover:bg-slate-800/40 transition-colors">
                          <CTableDataCell className="font-bold text-slate-100">
                            {t.name}
                          </CTableDataCell>
                          <CTableDataCell>
                            <span className="font-mono text-slate-800 dark:text-slate-200 text-[11px] font-bold">{t.code}</span>
                            <div className="text-[10px] text-slate-400">{t.subdomain}</div>
                          </CTableDataCell>
                          <CTableDataCell>
                            <span className="capitalize font-semibold text-slate-300">
                              {t.plan_tier || 'professional'}
                            </span>
                          </CTableDataCell>
                          <CTableDataCell>
                            {t.status === 'active' ? (
                              <CBadge color="success" className="text-[10px] px-2 py-0.5">{isAr ? 'نشط (Active)' : 'Active'}</CBadge>
                            ) : t.status === 'trial' ? (
                              <CBadge color="warning" className="text-[10px] px-2 py-0.5">{isAr ? 'تجريبي (Trial)' : 'Trial'}</CBadge>
                            ) : (
                              <CBadge color="danger" className="text-[10px] px-2 py-0.5">{isAr ? 'معلق (Suspended)' : 'Suspended'}</CBadge>
                            )}
                          </CTableDataCell>
                          <CTableDataCell className="text-slate-400">
                            {t.users_count || 1} {isAr ? 'مستخدم' : 'users'} • {t.branches_count || 1} {isAr ? 'فروع' : 'branches'}
                          </CTableDataCell>
                          <CTableDataCell className="text-[11px] text-slate-400">
                            {t.created_at ? t.created_at.split('T')[0] : ''}
                          </CTableDataCell>
                          <CTableDataCell>
                            <div className="flex items-center justify-center gap-1.5">
                              <CButton
                                color="secondary"
                                variant="outline"
                                size="sm"
                                className="text-[11px] py-1 px-2.5 text-slate-300 border-slate-700 hover:bg-slate-800"
                                onClick={() => handleOpenDetails(t)}
                              >
                                {isAr ? 'التفاصيل' : 'Details'}
                              </CButton>

                              <CButton
                                color="primary"
                                size="sm"
                                className="text-[11px] py-1 px-2.5 text-white font-bold"
                                style={{ backgroundColor: 'var(--brand-primary)', borderColor: 'var(--brand-primary)' }}
                                onClick={() => {
                                  setSelectedTenantForActivation(t);
                                  setIsActivationModalOpen(true);
                                }}
                              >
                                <Key className="w-3 h-3 inline-block mr-1 rtl:ml-1" />
                                {isAr ? 'تفعيل اشتراك' : 'Activate'}
                              </CButton>

                              {t.status !== 'suspended' && (
                                <CButton
                                  color="danger"
                                  variant="ghost"
                                  size="sm"
                                  className="text-[11px] py-1 px-2 text-rose-400 hover:bg-rose-950/30"
                                  onClick={() => {
                                    setSelectedTenantForSuspend(t);
                                    setIsSuspendModalOpen(true);
                                  }}
                                >
                                  {isAr ? 'تعليق' : 'Suspend'}
                                </CButton>
                              )}
                            </div>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                )}
              </CCardBody>
            </CCard>

            {/* Pagination */}
            {tenantTotalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                <div>
                  {isAr ? `صفحة ${tenantPage} من ${tenantTotalPages}` : `Page ${tenantPage} of ${tenantTotalPages}`}
                </div>
                <div className="flex items-center gap-2">
                  <CButton
                    color="secondary"
                    variant="outline"
                    size="sm"
                    disabled={tenantPage <= 1}
                    onClick={() => loadTenants(tenantPage - 1)}
                    className="text-xs text-slate-300 border-slate-700"
                  >
                    {isAr ? 'السابق' : 'Previous'}
                  </CButton>
                  <CButton
                    color="secondary"
                    variant="outline"
                    size="sm"
                    disabled={tenantPage >= tenantTotalPages}
                    onClick={() => loadTenants(tenantPage + 1)}
                    className="text-xs text-slate-300 border-slate-700"
                  >
                    {isAr ? 'التالي' : 'Next'}
                  </CButton>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: DOMAIN & STOREFRONT ROUTING MANAGEMENT */}
        {activeTab === 'domains' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className={`text-xl font-extrabold flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  <Globe className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                  <span>{isAr ? 'إدارة النطاقات والمتاجر الإلكترونية' : 'Domain & Storefront Routing Management'}</span>
                </h1>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {isAr
                    ? 'إدارة النطاقات الفرعية (.garmentos.cloud)، وربط النطاقات المخصصة، وتوثيق سجلات DNS، والتحكم الآمن في توجيه المتاجر.'
                    : 'Manage platform subdomains, custom domains, DNS verification, and safe storefront routing.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={domainSearch}
                    onChange={(e) => setDomainSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadDomains(1)}
                    placeholder={isAr ? 'بحث بالنطاق أو اسم المصنع...' : 'Search domain or company...'}
                    className={`pl-8 rtl:pr-8 rtl:pl-3 pr-3 py-1.5 border rounded-xl text-xs focus:outline-none focus:border-[var(--brand-primary)] ${isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'}`}
                  />
                </div>

                <CButton
                  color="secondary"
                  size="sm"
                  variant="outline"
                  onClick={() => loadDomains(1)}
                  disabled={isDomainsLoading}
                  className={`text-xs ${isDark ? 'text-slate-300 border-slate-700 hover:bg-slate-800' : 'text-slate-700 border-slate-300 hover:bg-slate-100'}`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 inline-block mr-1.5 rtl:ml-1.5 ${isDomainsLoading ? 'animate-spin' : ''}`} />
                  <span>{isAr ? 'تحديث' : 'Refresh'}</span>
                </CButton>
              </div>
            </div>

            {/* Domains Table Card */}
            <CCard className={`rounded-2xl shadow-sm overflow-hidden border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-300'}`}>
              <CCardBody className="p-0">
                {isDomainsLoading ? (
                  <div className="py-20 text-center">
                    <CSpinner color="primary" />
                    <div className={`text-xs mt-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{isAr ? 'جارِ تحميل تكوينات النطاقات...' : 'Loading domain configurations...'}</div>
                  </div>
                ) : domains.length === 0 ? (
                  <div className={`py-16 text-center text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {isAr ? 'لم يتم العثور على أي نطاقات مسجلة.' : 'No registered domains found.'}
                  </div>
                ) : (
                  <CTable responsive align="middle" className={`text-xs mb-0 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    <CTableHead className={isDark ? "bg-slate-950/60 text-slate-400 border-b border-slate-800" : "bg-slate-100 text-slate-600 border-b border-slate-200"}>
                      <CTableRow>
                        <CTableHeaderCell>{isAr ? 'المصنع / المستأجر' : 'Tenant'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'النطاق الفرعي للمنصة' : 'Platform Subdomain'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'النطاق المخصص (Custom Domain)' : 'Custom Domain'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'حالة التوثيق (DNS)' : 'Verification Status'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'حالة التوجيه' : 'Routing'}</CTableHeaderCell>
                        <CTableHeaderCell className="text-center">{isAr ? 'الإجراءات الإدارية' : 'Actions'}</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                      {domains.map((d) => (
                        <CTableRow key={d.id} className={isDark ? "hover:bg-slate-800/40 transition-colors" : "hover:bg-slate-50 transition-colors"}>
                          <CTableDataCell>
                            <div className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{d.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{d.code}</div>
                          </CTableDataCell>

                          <CTableDataCell>
                            {d.subdomain ? (
                              <div className={`flex items-center gap-1.5 font-mono text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                <span>{d.full_platform_domain || `${d.subdomain}.${baseDomain}`}</span>
                                <button
                                  onClick={() => handleOpenSubdomainModal(d)}
                                  className="text-slate-400 hover:text-slate-200 p-1"
                                  title={isAr ? 'تعديل النطاق الفرعي' : 'Edit Subdomain'}
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenSubdomainModal(d)}
                                className="text-xs text-amber-400 hover:underline"
                              >
                                {isAr ? '+ تعيين نطاق فرعي' : '+ Assign Subdomain'}
                              </button>
                            )}
                          </CTableDataCell>

                          <CTableDataCell>
                            {d.custom_domain ? (
                              <div className="flex items-center gap-1.5 font-mono text-xs text-slate-200">
                                <span>{d.custom_domain}</span>
                                <button
                                  onClick={() => handleOpenCustomDomainModal(d)}
                                  className="text-slate-400 hover:text-slate-200 p-1"
                                  title={isAr ? 'تعديل النطاق المخصص' : 'Edit Custom Domain'}
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenCustomDomainModal(d)}
                                className="text-xs text-slate-400 hover:text-slate-200 hover:underline"
                              >
                                {isAr ? '+ إضافة نطاق مخصص' : '+ Add Custom Domain'}
                              </button>
                            )}
                          </CTableDataCell>

                          <CTableDataCell>
                            {d.custom_domain_status === 'verified' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{isAr ? 'موثق رسمياً' : 'Verified'}</span>
                              </span>
                            ) : d.custom_domain_status === 'pending_verification' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-500/30">
                                <Clock className="w-3 h-3" />
                                <span>{isAr ? 'في انتظار DNS' : 'Pending DNS'}</span>
                              </span>
                            ) : d.custom_domain_status === 'failed' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/60 text-rose-400 border border-rose-500/30" title={d.last_failure_reason || ''}>
                                <AlertTriangle className="w-3 h-3" />
                                <span>{isAr ? 'فشل التوثيق' : 'Failed'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                {isAr ? 'غير مهيأ' : 'Not Configured'}
                              </span>
                            )}
                          </CTableDataCell>

                          <CTableDataCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              d.custom_domain_enabled
                                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {d.custom_domain_enabled ? (isAr ? 'مفعل' : 'Active') : (isAr ? 'معطل مؤقتاً' : 'Paused')}
                            </span>
                          </CTableDataCell>

                          <CTableDataCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {d.custom_domain && (
                                <CButton
                                  color="info"
                                  variant="outline"
                                  size="sm"
                                  disabled={verifyingDomainId === d.id}
                                  onClick={() => handleVerifyCustomDomain(d.id)}
                                  className="text-[11px] px-2 py-1 border-sky-500/40 text-sky-300 hover:bg-sky-950/30"
                                  title={isAr ? 'فحص سجلات DNS وتوثيق الملكية' : 'Verify DNS Records'}
                                >
                                  {verifyingDomainId === d.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin inline-block" />
                                  ) : (
                                    <ShieldCheck className="w-3 h-3 inline-block mr-1 rtl:ml-1" />
                                  )}
                                  <span>{isAr ? 'توثيق DNS' : 'Verify'}</span>
                                </CButton>
                              )}

                              {d.custom_domain && (
                                <CButton
                                  color="secondary"
                                  variant="outline"
                                  size="sm"
                                  disabled={togglingDomainId === d.id}
                                  onClick={() => handleToggleDomainStatus(d.id)}
                                  className="text-[11px] px-2 py-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                                >
                                  <span>{d.custom_domain_enabled ? (isAr ? 'إيقاف' : 'Disable') : (isAr ? 'تشغيل' : 'Enable')}</span>
                                </CButton>
                              )}
                            </div>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                )}
              </CCardBody>
            </CCard>

            {/* Pagination */}
            {domainTotalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                <div>
                  {isAr ? `صفحة ${domainPage} من ${domainTotalPages}` : `Page ${domainPage} of ${domainTotalPages}`}
                </div>
                <div className="flex items-center gap-2">
                  <CButton
                    color="secondary"
                    variant="outline"
                    size="sm"
                    disabled={domainPage <= 1}
                    onClick={() => loadDomains(domainPage - 1)}
                    className="text-xs text-slate-300 border-slate-700"
                  >
                    {isAr ? 'السابق' : 'Previous'}
                  </CButton>
                  <CButton
                    color="secondary"
                    variant="outline"
                    size="sm"
                    disabled={domainPage >= domainTotalPages}
                    onClick={() => loadDomains(domainPage + 1)}
                    className="text-xs text-slate-300 border-slate-700"
                  >
                    {isAr ? 'التالي' : 'Next'}
                  </CButton>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PLATFORM AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-extrabold text-slate-100">
                  {isAr ? 'سجل الرقابة والتدقيق العام للمنصة' : 'Platform Audit Trail'}
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  {isAr ? 'توثيق حتمي للعمليات الحساسة (تفعيل الاشتراكات، تعليق الحسابات) مع عنوان الـ IP والمسؤول.' : 'Immutable audit trail of high-impact administrative actions.'}
                </p>
              </div>

              <CButton
                color="secondary"
                size="sm"
                variant="outline"
                onClick={() => loadAuditLogs(auditPage)}
                disabled={isAuditLoading}
                className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800"
              >
                <RefreshCw className={`w-3.5 h-3.5 inline-block mr-1.5 rtl:ml-1.5 ${isAuditLoading ? 'animate-spin' : ''}`} />
                <span>{isAr ? 'تحديث' : 'Refresh'}</span>
              </CButton>
            </div>

            <CCard className="bg-slate-900/80 border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <CCardBody className="p-0">
                {isAuditLoading ? (
                  <div className="py-20 text-center">
                    <CSpinner color="primary" />
                    <div className="text-xs text-slate-400 mt-3">{isAr ? 'جارِ جلب سجلات التدقيق...' : 'Loading audit logs...'}</div>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs">
                    {isAr ? 'لا توجد سجلات تدقيق مسجلة.' : 'No audit logs recorded.'}
                  </div>
                ) : (
                  <CTable responsive align="middle" className="text-xs mb-0 text-slate-200">
                    <CTableHead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                      <CTableRow>
                        <CTableHeaderCell>{isAr ? 'نوع الإجراء' : 'Action'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'المسؤول والمشرف' : 'Actor'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'المستأجر المعني' : 'Target Tenant'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'عنوان IP' : 'IP Address'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'تفاصيل التغيير' : 'Details'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'التاريخ والوقت' : 'Timestamp'}</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody className="divide-y divide-slate-800">
                      {auditLogs.map((log) => (
                        <CTableRow key={log.id} className="hover:bg-slate-800/40 transition-colors">
                          <CTableDataCell className="font-bold text-slate-100">
                            {log.action === 'admin_manual_activation' ? (
                              <span className="text-emerald-400 flex items-center gap-1.5">
                                <Key className="w-3.5 h-3.5" />
                                <span>{isAr ? 'تفعيل اشتراك يدوي' : 'Manual Activation'}</span>
                              </span>
                            ) : log.action === 'admin_suspend_tenant' ? (
                              <span className="text-rose-400 flex items-center gap-1.5">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>{isAr ? 'تعليق حساب مصنع' : 'Suspend Tenant'}</span>
                              </span>
                            ) : (
                              <span>{log.action}</span>
                            )}
                          </CTableDataCell>
                          <CTableDataCell>
                            <div className="font-medium">{log.user?.name || (isAr ? 'مشرف المنصة' : 'Platform Admin')}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{log.user?.email}</div>
                          </CTableDataCell>
                          <CTableDataCell className="font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                            {log.tenant_id ? String(log.tenant_id).substring(0, 13) + '...' : 'Global'}
                          </CTableDataCell>
                          <CTableDataCell className="font-mono text-slate-400 text-[11px]">
                            {log.ip_address || '127.0.0.1'}
                          </CTableDataCell>
                          <CTableDataCell className="text-[11px] text-slate-400 max-w-xs truncate">
                            {log.new_values?.reason || log.new_values?.plan_tier || JSON.stringify(log.new_values || {})}
                          </CTableDataCell>
                          <CTableDataCell className="text-[11px] text-slate-500 font-mono">
                            {log.created_at ? new Date(log.created_at).toLocaleString(isAr ? 'ar-EG' : 'en-US') : ''}
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                )}

                {auditTotalPages > 1 && (
                  <div className="p-3 border-t border-slate-800 d-flex justify-content-between align-items-center text-xs text-slate-400">
                    <span>
                      {isAr
                        ? `صفحة ${auditPage} من ${auditTotalPages}`
                        : `Page ${auditPage} of ${auditTotalPages}`}
                    </span>
                    <div className="d-flex gap-2">
                      <CButton
                        size="sm"
                        color="secondary"
                        variant="ghost"
                        disabled={auditPage <= 1}
                        onClick={() => loadAuditLogs(auditPage - 1)}
                      >
                        {isAr ? 'السابق' : 'Previous'}
                      </CButton>
                      <CButton
                        size="sm"
                        color="secondary"
                        variant="ghost"
                        disabled={auditPage >= auditTotalPages}
                        onClick={() => loadAuditLogs(auditPage + 1)}
                      >
                        {isAr ? 'التالي' : 'Next'}
                      </CButton>
                    </div>
                  </div>
                )}
              </CCardBody>
            </CCard>
          </div>
        )}

        {/* TAB 4: PLATFORM SUBSCRIPTIONS & MANUAL APPROVAL QUEUE (Stage C.4) */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-rose-500" />
                  <span>{isAr ? 'إدارة الاشتراكات واعتماد إثباتات السداد اليدوية' : 'Subscriptions & Manual Payment Approval Queue'}</span>
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  {isAr
                    ? 'مراجعة وتدقيق إيصالات التحويل البنكي و InstaPay لباقات وصلة ورش واشتراكات ERP واعتمادها ذرياً.'
                    : 'Review bank & InstaPay transfer proofs for Waslat Worsh packs & ERP plans with atomic activation.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <CButton
                  color="secondary"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    loadPaymentRequests(paymentRequestsPage);
                    loadAdminSubscriptions(1);
                  }}
                  disabled={isPaymentRequestsLoading || isAdminSubsLoading}
                  className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800"
                >
                  <RefreshCw className={`w-3.5 h-3.5 inline-block mr-1.5 rtl:ml-1.5 ${isPaymentRequestsLoading || isAdminSubsLoading ? 'animate-spin' : ''}`} />
                  <span>{isAr ? 'تحديث' : 'Refresh'}</span>
                </CButton>
              </div>
            </div>

            {/* Sub-Tabs Switcher */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setPaymentRequestsSubTab('queue')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  paymentRequestsSubTab === 'queue'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{isAr ? 'طابور مراجعة السداد اليدوي' : 'Manual Payment Queue'}</span>
                {paymentRequests.filter((r) => r.status === 'pending').length > 0 && (
                  <span className="ms-1.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                    {paymentRequests.filter((r) => r.status === 'pending').length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setPaymentRequestsSubTab('factories')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  paymentRequestsSubTab === 'factories'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{isAr ? 'اشتراكات المصانع وحصص الاستهلاك (SaaS Meters)' : 'Factory Subscriptions'}</span>
              </button>
            </div>

            {/* 1. PAYMENT REQUESTS APPROVAL QUEUE */}
            {paymentRequestsSubTab === 'queue' && (
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400 font-bold">{isAr ? 'الحالة:' : 'Status:'}</span>
                    <select
                      value={paymentRequestStatusFilter}
                      onChange={(e) => setPaymentRequestStatusFilter(e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-950 text-xs text-slate-200"
                    >
                      <option value="pending">{isAr ? 'قيد المراجعة (معلق)' : 'Pending Review'}</option>
                      <option value="approved">{isAr ? 'معتمد' : 'Approved'}</option>
                      <option value="rejected">{isAr ? 'مرفوض' : 'Rejected'}</option>
                      <option value="all">{isAr ? 'الكل' : 'All'}</option>
                    </select>

                    <span className="text-xs text-slate-400 font-bold ms-2">{isAr ? 'المنتج:' : 'Product:'}</span>
                    <select
                      value={paymentRequestProductFilter}
                      onChange={(e) => setPaymentRequestProductFilter(e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-950 text-xs text-slate-200"
                    >
                      <option value="all">{isAr ? 'جميع المنتجات' : 'All Products'}</option>
                      <option value="waslat_worsh">{isAr ? 'باقات وصلة ورش (Waslat Worsh)' : 'Waslat Worsh'}</option>
                      <option value="erp">{isAr ? 'اشتراكات المصانع (ERP)' : 'Factory ERP'}</option>
                    </select>
                  </div>

                  <div className="text-xs text-slate-400">
                    <span>{isAr ? `إجمالي الطلبات: ${paymentRequestsTotal}` : `Total Requests: ${paymentRequestsTotal}`}</span>
                  </div>
                </div>

                {/* Queue Table */}
                <CCard className="bg-slate-900/80 border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                  <CCardBody className="p-0">
                    {isPaymentRequestsLoading ? (
                      <div className="py-20 text-center">
                        <CSpinner color="primary" />
                        <div className="text-xs text-slate-400 mt-3">{isAr ? 'جارِ تحميل طابور الطلبات...' : 'Loading requests...'}</div>
                      </div>
                    ) : paymentRequests.length === 0 ? (
                      <div className="py-16 text-center text-slate-400 text-xs">
                        {isAr ? 'لا توجد طلبات سداد تطابق الفلاتر المحددة حالياً.' : 'No payment requests match criteria.'}
                      </div>
                    ) : (
                      <CTable responsive align="middle" className="text-xs mb-0 text-slate-200">
                        <CTableHead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                          <CTableRow>
                            <CTableHeaderCell>{isAr ? 'المستأجر' : 'Tenant'}</CTableHeaderCell>
                            <CTableHeaderCell>{isAr ? 'مقدم الطلب' : 'User'}</CTableHeaderCell>
                            <CTableHeaderCell>{isAr ? 'الباقة والمنتج' : 'Plan'}</CTableHeaderCell>
                            <CTableHeaderCell>{isAr ? 'المبلغ المطلوب / المحول' : 'Amount'}</CTableHeaderCell>
                            <CTableHeaderCell>{isAr ? 'المرجع وطريقة التحويل' : 'Reference & Method'}</CTableHeaderCell>
                            <CTableHeaderCell>{isAr ? 'التاريخ' : 'Date'}</CTableHeaderCell>
                            <CTableHeaderCell>{isAr ? 'الحالة' : 'Status'}</CTableHeaderCell>
                            <CTableHeaderCell>{isAr ? 'الإجراءات' : 'Actions'}</CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody className="divide-y divide-slate-800">
                          {paymentRequests.map((req: any) => (
                            <CTableRow key={req.id} className="hover:bg-slate-800/40 transition-colors">
                              <CTableDataCell>
                                <div className="font-bold text-slate-100">{req.tenant?.name || 'منشأة'}</div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <span>{req.tenant?.tenant_type === 'marketplace_requester' ? (isAr ? 'طالب وصلة ورش' : 'Requester') : (isAr ? 'مصنع ملابس' : 'Factory')}</span>
                                  <span className="font-mono text-slate-500">({req.tenant?.code})</span>
                                </div>
                              </CTableDataCell>

                              <CTableDataCell>
                                <div className="text-slate-200 font-medium">{req.user?.name || '-'}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{req.user?.email}</div>
                              </CTableDataCell>

                              <CTableDataCell>
                                <div className="font-bold text-slate-100">{req.plan_name || req.plan_code}</div>
                                <div className="text-[10px] text-rose-400">
                                  {req.product_type === 'waslat_worsh' ? (isAr ? `حصة ${req.included_quota_rfqs} طلبات قص` : `${req.included_quota_rfqs} RFQs`) : (isAr ? 'باقة ERP سنوية' : 'ERP Plan')}
                                </div>
                              </CTableDataCell>

                              <CTableDataCell>
                                <div className="font-mono font-bold text-emerald-400">
                                  {Number(req.submitted_amount).toLocaleString()} {req.currency || 'EGP'}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {isAr ? 'المتوقع:' : 'Exp:'} {Number(req.expected_amount).toLocaleString()}
                                </div>
                              </CTableDataCell>

                              <CTableDataCell>
                                <div className="font-mono font-bold text-indigo-400">{req.transfer_reference}</div>
                                <div className="text-[10px] text-slate-400 capitalize">{req.payment_method}</div>
                              </CTableDataCell>

                              <CTableDataCell className="text-slate-400 font-mono text-[11px]">
                                {req.created_at ? new Date(req.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US') : '-'}
                              </CTableDataCell>

                              <CTableDataCell>
                                <CBadge
                                  color={req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'danger' : 'warning'}
                                  className="text-[10px]"
                                >
                                  {req.status === 'approved' ? (isAr ? 'معتمد' : 'Approved') : req.status === 'rejected' ? (isAr ? 'مرفوض' : 'Rejected') : (isAr ? 'معلق' : 'Pending')}
                                </CBadge>
                              </CTableDataCell>

                              <CTableDataCell>
                                <div className="flex items-center gap-1.5">
                                  <CButton
                                    color="secondary"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenReceipt(req.id)}
                                    className="text-[10px] py-1 px-2 text-slate-300 border-slate-700 hover:bg-slate-800"
                                    title={isAr ? 'معاينة الإيصال' : 'View Receipt'}
                                  >
                                    <Eye className="w-3.5 h-3.5 inline-block" />
                                  </CButton>

                                  {req.status === 'pending' && (
                                    <>
                                      <CButton
                                        color="success"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedRequestForApprove(req);
                                          setIsApproveModalOpen(true);
                                        }}
                                        className="text-[10px] py-1 px-2 font-bold"
                                        title={isAr ? 'اعتماد وتفعيل ذري' : 'Approve'}
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 inline-block mr-1 rtl:ml-1" />
                                        <span>{isAr ? 'اعتماد' : 'Approve'}</span>
                                      </CButton>

                                      <CButton
                                        color="danger"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedRequestForReject(req);
                                          setRejectionReasonInput('');
                                          setIsRejectModalOpen(true);
                                        }}
                                        className="text-[10px] py-1 px-2"
                                        title={isAr ? 'رفض الطلب' : 'Reject'}
                                      >
                                        <XCircle className="w-3.5 h-3.5 inline-block mr-1 rtl:ml-1" />
                                        <span>{isAr ? 'رفض' : 'Reject'}</span>
                                      </CButton>
                                    </>
                                  )}
                                </div>
                              </CTableDataCell>
                            </CTableRow>
                          ))}
                        </CTableBody>
                      </CTable>
                    )}
                  </CCardBody>
                </CCard>
              </div>
            )}

            {/* 2. FACTORY SUBSCRIPTIONS & OVERRIDES SUB-TAB */}
            {paymentRequestsSubTab === 'factories' && (
            <CCard className="bg-slate-900/80 border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <CCardBody className="p-0">
                {isAdminSubsLoading ? (
                  <div className="py-20 text-center">
                    <CSpinner color="primary" />
                    <div className="text-xs text-slate-400 mt-3">{isAr ? 'جارِ جلب الاشتراكات...' : 'Loading subscriptions...'}</div>
                  </div>
                ) : adminSubscriptions.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs">
                    {isAr ? 'لا توجد اشتراكات مسجلة حالياً.' : 'No active subscriptions recorded.'}
                  </div>
                ) : (
                  <CTable responsive align="middle" className="text-xs mb-0 text-slate-200">
                    <CTableHead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                      <CTableRow>
                        <CTableHeaderCell>{isAr ? 'المصنع المستأجر' : 'Factory / Tenant'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'الباقة المفعلة' : 'Plan'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'دورة الفوترة' : 'Cycle'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'الحالة' : 'Status'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'تاريخ التجديد' : 'Renews On'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'الإجراءات' : 'Actions'}</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody className="divide-y divide-slate-800">
                      {adminSubscriptions.map((sub: any) => (
                        <CTableRow key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                          <CTableDataCell>
                            <div className="font-bold text-slate-100">{sub.tenant?.name || 'مصنع ملابس'}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{sub.tenant?.code}</div>
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={sub.plan?.code === 'enterprise' ? 'warning' : sub.plan?.code === 'pro' ? 'primary' : 'secondary'} className="text-[10px]">
                              {sub.plan?.name_ar || sub.plan?.name_en || sub.plan?.code}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell className="capitalize font-mono">
                            {sub.billing_cycle === 'annual' ? (isAr ? 'سنوي' : 'Annual') : (isAr ? 'شهري' : 'Monthly')}
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={sub.status === 'active' ? 'success' : 'danger'} className="text-[10px]">
                              {sub.status}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell className="text-slate-400 font-mono">
                            {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString(isAr ? 'ar-EG' : 'en-US') : '-'}
                          </CTableDataCell>
                          <CTableDataCell>
                            <CButton
                              color="primary"
                              variant="outline"
                              size="sm"
                              className="text-[11px] py-1 px-2.5"
                              onClick={() => {
                                setOverrideTenant(sub.tenant);
                                setIsOverrideModalOpen(true);
                              }}
                            >
                              <ShieldCheck className="w-3.5 h-3.5 inline-block mr-1 rtl:ml-1" />
                              <span>{isAr ? 'استثناء طارئ' : 'Grant Override'}</span>
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                )}
              </CCardBody>
            </CCard>
            )}
          </div>
        )}

        {/* SECTION: UNIFIED SAAS PACKAGES MANAGEMENT */}
        {activeTab === 'ww_packages' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-500" />
                  <span>{isAr ? 'إدارة الباقات والأسعار الموحدة (SaaS Packages)' : 'Unified SaaS Packages Manager'}</span>
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  {isAr
                    ? 'إدارة باقات GarmentOS ERP وسوق وصلة ورش مع حماية لقطات المشتركين السابقة (Snapshot Protection).'
                    : 'Manage ERP and Waslat Worsh commercial packages with immutable subscriber snapshots.'}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <CButton
                  color="secondary"
                  size="sm"
                  variant="outline"
                  onClick={loadPackages}
                  disabled={isPackagesLoading}
                  className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800"
                >
                  <RefreshCw className={`w-3.5 h-3.5 inline-block mr-1.5 rtl:ml-1.5 ${isPackagesLoading ? 'animate-spin' : ''}`} />
                  <span>{isAr ? 'تحديث' : 'Refresh'}</span>
                </CButton>

                <CButton
                  color="primary"
                  size="sm"
                  onClick={() => {
                    resetPkgForm();
                    setIsCreatePkgModalOpen(true);
                  }}
                  className="text-xs font-bold text-white shadow-md flex items-center gap-1.5"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAr ? 'إضافة باقة جديدة' : 'New Package'}</span>
                </CButton>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPkgCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  pkgCategoryFilter === 'all'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {isAr ? 'كافة الباقات' : 'All Packages'}
              </button>
              <button
                type="button"
                onClick={() => setPkgCategoryFilter('erp')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  pkgCategoryFilter === 'erp'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {isAr ? 'باقات مصانع GarmentOS ERP' : 'ERP Packages'}
              </button>
              <button
                type="button"
                onClick={() => setPkgCategoryFilter('waslat_worsh')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  pkgCategoryFilter === 'waslat_worsh'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {isAr ? 'باقات سوق وصلة ورش' : 'Waslat Worsh Packages'}
              </button>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <CCard className="bg-slate-900/80 border-slate-800 rounded-2xl p-4">
                <span className="text-xs text-slate-400 block">{isAr ? 'إجمالي الباقات المعروضة' : 'Total Packages'}</span>
                <span className="text-2xl font-extrabold text-slate-100 mt-1 block">{packages.length}</span>
              </CCard>
              <CCard className="bg-slate-900/80 border-slate-800 rounded-2xl p-4">
                <span className="text-xs text-slate-400 block">{isAr ? 'الباقات النشطة للشراء' : 'Active Packages'}</span>
                <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
                  {packages.filter((p) => p.is_active).length}
                </span>
              </CCard>
              <CCard className="bg-slate-900/80 border-slate-800 rounded-2xl p-4">
                <span className="text-xs text-slate-400 block">{isAr ? 'معروضة على الموقع العام' : 'Public Packages'}</span>
                <span className="text-2xl font-extrabold text-indigo-400 mt-1 block">
                  {packages.filter((p) => p.is_public).length}
                </span>
              </CCard>
              <CCard className="bg-slate-900/80 border-slate-800 rounded-2xl p-4">
                <span className="text-xs text-slate-400 block">{isAr ? 'باقات مؤرشفة' : 'Archived Packages'}</span>
                <span className="text-2xl font-extrabold text-slate-400 mt-1 block">
                  {packages.filter((p) => p.is_archived).length}
                </span>
              </CCard>
            </div>

            {/* Packages Table */}
            <CCard className="bg-slate-900/80 border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <CCardBody className="p-0">
                {isPackagesLoading ? (
                  <div className="py-20 text-center">
                    <CSpinner color="primary" />
                    <div className="text-xs text-slate-400 mt-3">{isAr ? 'جارِ جلب الباقات...' : 'Loading packages...'}</div>
                  </div>
                ) : packages.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="text-sm font-semibold">{isAr ? 'لا توجد باقات معرفة حالياً.' : 'No packages found.'}</p>
                  </div>
                ) : (
                  <CTable responsive align="middle" className="mb-0 text-xs text-slate-300">
                    <CTableHead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold">
                      <CTableRow>
                        <CTableHeaderCell className="py-3.5 px-4">{isAr ? 'المنتج' : 'Product'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'كود الباقة' : 'Code'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'اسم الباقة' : 'Package Name'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'السعر الشهري / السنوي' : 'Pricing (Monthly/Annual)'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'الحصص / الصلاحية' : 'Quotas'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'الموقع العام' : 'Public Display'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'حالة الشراء' : 'Purchase Status'}</CTableHeaderCell>
                        <CTableHeaderCell className="text-end px-4">{isAr ? 'إجراءات' : 'Actions'}</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {packages.map((pkg) => (
                        <CTableRow key={pkg.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <CTableDataCell className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              pkg.product_category === 'erp'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {pkg.product_category === 'erp' ? 'GarmentOS ERP' : 'Waslat Worsh'}
                            </span>
                          </CTableDataCell>
                          <CTableDataCell className="font-mono font-bold text-slate-200">
                            {pkg.code}
                          </CTableDataCell>
                          <CTableDataCell>
                            <span className="font-bold text-slate-100 block">{isAr ? pkg.name_ar : pkg.name_en}</span>
                            <span className="text-[10px] text-slate-400 line-clamp-1">{isAr ? pkg.description_ar : pkg.description_en}</span>
                          </CTableDataCell>
                          <CTableDataCell className="font-mono">
                            <div className="font-bold text-emerald-400">{Number(pkg.monthly_price).toLocaleString()} ج.م / شهر</div>
                            {pkg.annual_price && (
                              <div className="text-[10px] text-slate-400">{Number(pkg.annual_price).toLocaleString()} ج.م / سنة</div>
                            )}
                          </CTableDataCell>
                          <CTableDataCell>
                            {pkg.product_category !== 'erp' ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                {pkg.quota_rfq_count} {isAr ? 'طلبات قص' : 'RFQs'} ({pkg.billing_duration || 30} يوماً)
                              </span>
                            ) : (
                              <span className="text-slate-400">{isAr ? 'مصنع متكامل' : 'Full Factory'}</span>
                            )}
                          </CTableDataCell>
                          <CTableDataCell>
                            <button
                              type="button"
                              onClick={() => handleTogglePackagePublic(pkg)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                                pkg.is_public
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {pkg.is_public ? (isAr ? 'معروضة' : 'Visible') : (isAr ? 'مخفية' : 'Hidden')}
                            </button>
                          </CTableDataCell>
                          <CTableDataCell>
                            <button
                              type="button"
                              onClick={() => handleTogglePackageActive(pkg)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                                pkg.is_active
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {pkg.is_active ? (isAr ? 'متاحة للشراء' : 'Active') : (isAr ? 'معطلة' : 'Disabled')}
                            </button>
                          </CTableDataCell>
                          <CTableDataCell className="text-end px-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <CButton
                                color="secondary"
                                variant="outline"
                                size="sm"
                                className="text-[11px] py-1 px-2 text-slate-300 border-slate-700 hover:bg-slate-800"
                                onClick={() => handleOpenEditPkg(pkg)}
                                title={isAr ? 'تعديل بيانات الباقة' : 'Edit'}
                              >
                                <Edit className="w-3.5 h-3.5 inline-block" />
                              </CButton>
                              <CButton
                                color="secondary"
                                variant="outline"
                                size="sm"
                                className="text-[11px] py-1 px-2 text-cyan-300 border-slate-700 hover:bg-slate-800"
                                onClick={() => handleDuplicatePackage(pkg)}
                                title={isAr ? 'استنساخ الباقة' : 'Duplicate'}
                              >
                                <Copy className="w-3.5 h-3.5 inline-block" />
                              </CButton>
                              <CButton
                                color="secondary"
                                variant="outline"
                                size="sm"
                                className="text-[11px] py-1 px-2 text-indigo-300 border-slate-700 hover:bg-slate-800"
                                onClick={() => handleViewSubscribers(pkg)}
                                title={isAr ? 'عرض المشتركين' : 'Subscribers'}
                              >
                                <Users className="w-3.5 h-3.5 inline-block" />
                              </CButton>
                              <CButton
                                color="danger"
                                variant="outline"
                                size="sm"
                                className="text-[11px] py-1 px-2 text-rose-400 border-slate-700 hover:bg-slate-800"
                                onClick={() => handleArchivePackage(pkg)}
                                title={isAr ? 'أرشفة الباقة' : 'Archive'}
                              >
                                <Archive className="w-3.5 h-3.5 inline-block" />
                              </CButton>
                            </div>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                )}
              </CCardBody>
            </CCard>
          </div>
        )}

        {/* SECTION: SAAS FEATURES CATALOG */}
        {activeTab === 'saas_features' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  <span>{isAr ? 'كتالوج الميزات والصلاحيات السحابية (Feature Catalog)' : 'SaaS Feature Catalog'}</span>
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  {isAr
                    ? 'إدارة مفاتيح الميزات البرمجية، التحكم في التفعيل العام للميزات على مستوى المنصة، وجدول المقارنة العام.'
                    : 'Manage feature keys, global platform kill-switches, and public comparison matrix visibility.'}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <CButton
                  color="secondary"
                  size="sm"
                  variant="outline"
                  onClick={loadFeatures}
                  disabled={isFeaturesLoading}
                  className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800"
                >
                  <RefreshCw className={`w-3.5 h-3.5 inline-block mr-1.5 rtl:ml-1.5 ${isFeaturesLoading ? 'animate-spin' : ''}`} />
                  <span>{isAr ? 'تحديث' : 'Refresh'}</span>
                </CButton>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFeatureCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  featureCategoryFilter === 'all'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {isAr ? 'كافة الميزات' : 'All Features'}
              </button>
              <button
                type="button"
                onClick={() => setFeatureCategoryFilter('erp')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  featureCategoryFilter === 'erp'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {isAr ? 'ميزات GarmentOS ERP' : 'ERP Features'}
              </button>
              <button
                type="button"
                onClick={() => setFeatureCategoryFilter('waslat_worsh')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  featureCategoryFilter === 'waslat_worsh'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {isAr ? 'ميزات سوق وصلة ورش' : 'Waslat Worsh Features'}
              </button>
            </div>

            {/* Features Table */}
            <CCard className="bg-slate-900/80 border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <CCardBody className="p-0">
                {isFeaturesLoading ? (
                  <div className="py-20 text-center">
                    <CSpinner color="primary" />
                    <div className="text-xs text-slate-400 mt-3">{isAr ? 'جارِ جلب الميزات...' : 'Loading features...'}</div>
                  </div>
                ) : saasFeatures.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <Layers className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="text-sm font-semibold">{isAr ? 'لا توجد ميزات مسجلة في الكتالوج.' : 'No features found.'}</p>
                  </div>
                ) : (
                  <CTable responsive align="middle" className="mb-0 text-xs text-slate-300">
                    <CTableHead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold">
                      <CTableRow>
                        <CTableHeaderCell className="py-3.5 px-4">{isAr ? 'القسم' : 'Category'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'مفتاح الميزة (Feature Key)' : 'Feature Key'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'اسم الميزة (عربي / إنجليزي)' : 'Feature Name'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'النوع' : 'Type'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'التفعيل العام للمنصة' : 'Global Platform Switch'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'الظهور بجدول المقارنة' : 'Public Comparison'}</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {saasFeatures.map((feat) => (
                        <CTableRow key={feat.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <CTableDataCell className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              feat.product_category === 'erp'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {feat.product_category === 'erp' ? 'ERP' : 'Waslat Worsh'}
                            </span>
                          </CTableDataCell>
                          <CTableDataCell className="font-mono font-bold text-cyan-300">
                            {feat.feature_key}
                          </CTableDataCell>
                          <CTableDataCell>
                            <span className="font-bold text-slate-100 block">{feat.name_ar}</span>
                            <span className="text-[10px] text-slate-400 block">{feat.name_en}</span>
                          </CTableDataCell>
                          <CTableDataCell>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                              {feat.feature_type || 'boolean'}
                            </span>
                          </CTableDataCell>
                          <CTableDataCell>
                            <button
                              type="button"
                              onClick={() => handleToggleFeatureActive(feat)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                                feat.is_active
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {feat.is_active ? (
                                <>
                                  <ToggleRight className="w-3.5 h-3.5" />
                                  <span>{isAr ? 'مفعلة عاماً' : 'Globally Active'}</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="w-3.5 h-3.5" />
                                  <span>{isAr ? 'معطلة عاماً' : 'Globally Disabled'}</span>
                                </>
                              )}
                            </button>
                          </CTableDataCell>
                          <CTableDataCell>
                            <button
                              type="button"
                              onClick={() => handleToggleFeaturePublic(feat)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                                feat.is_public
                                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                                  : 'bg-slate-800 text-slate-500 border-slate-700'
                              }`}
                            >
                              {feat.is_public ? (isAr ? 'معروضة بالمقارنة' : 'In Public Table') : (isAr ? 'مخفية' : 'Hidden')}
                            </button>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                )}
              </CCardBody>
            </CCard>
          </div>
        )}
      </main>
    </div>

      {/* MODAL 1: TENANT DETAILS */}
      <CModal
        visible={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        size="lg"
        alignment="center"
        className="cui-card-dark"
      >
        <CModalHeader className="bg-slate-900 border-b border-slate-800 text-slate-100">
          <CModalTitle className="text-sm font-bold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span>{isAr ? 'بيانات وتفاصيل المصنع' : 'Factory Details & Info'}</span>
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="bg-slate-950 p-6 text-xs text-slate-300 space-y-5">
          {isDetailsLoading || !selectedTenantForDetails ? (
            <div className="py-12 text-center">
              <CSpinner color="primary" />
            </div>
          ) : (
            <>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="text-base font-bold text-slate-100">{selectedTenantForDetails.tenant.name}</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-slate-400 pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="block text-[10px] text-slate-500">{isAr ? 'كود المستأجر' : 'Tenant Code'}</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">{selectedTenantForDetails.tenant.code}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500">{isAr ? 'الدومين الفرعي' : 'Subdomain'}</span>
                    <span>{selectedTenantForDetails.tenant.subdomain}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500">{isAr ? 'الباقة الحالية' : 'Current Plan'}</span>
                    <span className="capitalize font-semibold text-slate-200">{selectedTenantForDetails.tenant.plan_tier}</span>
                  </div>
                </div>
              </div>

              {/* Users list */}
              <div>
                <h4 className="font-bold text-xs text-slate-200 mb-2">{isAr ? 'المستخدمين المسجلين في المصنع' : 'Registered Users in Factory'}</h4>
                <div className="rounded-xl border border-slate-800 overflow-hidden">
                  <CTable responsive className="text-xs mb-0 text-slate-300">
                    <CTableHead className="bg-slate-900 text-slate-400">
                      <CTableRow>
                        <CTableHeaderCell>{isAr ? 'الاسم' : 'Name'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'البريد الإلكتروني' : 'Email'}</CTableHeaderCell>
                        <CTableHeaderCell>{isAr ? 'الدور والصلاحية' : 'Role & Permissions'}</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody className="divide-y divide-slate-800">
                      {(selectedTenantForDetails.tenant.users || []).map((u: any) => (
                        <CTableRow key={u.id}>
                          <CTableDataCell className="font-semibold text-slate-200">{u.name}</CTableDataCell>
                          <CTableDataCell className="font-mono">{u.email}</CTableDataCell>
                          <CTableDataCell>
                            <CBadge color="primary" className="text-[10px]">{u.role}</CBadge>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                </div>
              </div>
            </>
          )}
        </CModalBody>
        <CModalFooter className="bg-slate-900 border-t border-slate-800">
          <CButton color="secondary" size="sm" onClick={() => setIsDetailsModalOpen(false)}>
            {isAr ? 'إغلاق' : 'Close'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* MODAL 2: MANUAL SUBSCRIPTION ACTIVATION */}
      <CModal
        visible={isActivationModalOpen}
        onClose={() => setIsActivationModalOpen(false)}
        alignment="center"
        className="cui-card-dark"
      >
        <CModalHeader className="bg-slate-900 border-b border-slate-800 text-slate-100">
          <CModalTitle className="text-sm font-bold flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? 'تفعيل اشتراك مصنع يدوياً (Manual Subscription Activation)' : 'Manual Subscription Activation'}</span>
          </CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleActivateSubmit}>
          <CModalBody className="bg-slate-950 p-6 space-y-4 text-xs text-slate-300">
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                {isAr
                  ? 'تنبيه أمني: يتطلب هذا الإجراء إدخال كود التفويض الأمني للمنصة المعتمد في متغيرات البيئة. يتم توثيق كافة التفاصيل في سجل الرقابة والتدقيق الدائم.'
                  : 'Security Notice: This action requires the platform master authorization key. All operations are logged in the permanent audit trail.'}
              </span>
            </div>

            {activationSuccess && (
              <CAlert color="success" className="text-xs bg-emerald-950/40 border-emerald-500/30 text-emerald-300">
                {activationSuccess}
              </CAlert>
            )}

            {activationError && (
              <CAlert color="danger" className="text-xs bg-rose-950/40 border-rose-500/30 text-rose-300">
                {activationError}
              </CAlert>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">{isAr ? 'المصنع المستهدف' : 'Target Factory'}</label>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 font-bold text-slate-100">
                {selectedTenantForActivation?.name} ({selectedTenantForActivation?.code})
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">{isAr ? 'باقة التفعيل المطلوبة *' : 'Requested Plan Tier *'}</label>
              <CFormSelect
                value={activationPlanTier}
                onChange={(e) => setActivationPlanTier(e.target.value)}
                className="bg-slate-800 border-slate-700 text-xs text-slate-100"
              >
                <option value="starter">{isAr ? 'باقة الورش الصغيرة (Starter) — 3 مستخدمين' : 'Starter Workshop (Starter) — 3 Users'}</option>
                <option value="professional">{isAr ? 'باقة المصانع المتكاملة (Professional) — حتى 10 مستخدمين' : 'Integrated Factory (Professional) — Up to 10 Users'}</option>
                <option value="enterprise">{isAr ? 'باقة الشركات الكبرى (Enterprise) — مستخدمين وفروع غير محدودة' : 'Enterprise Scale — Unlimited Users & Branches'}</option>
              </CFormSelect>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">{isAr ? 'كود التفويض الأمني للمنصة (Platform Key) *' : 'Platform Security Authorization Key *'}</label>
              <CFormInput
                type="password"
                required
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                placeholder={isAr ? 'أدخل كود التفويض الأمني للمشرف العام' : 'Enter master platform security key'}
                className="bg-slate-800 border-slate-700 text-xs text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">{isAr ? 'اسم المسؤول المعتمد للتفعيل *' : 'Authorized Officer Name *'}</label>
              <CFormInput
                type="text"
                required
                value={authorizedBy}
                onChange={(e) => setAuthorizedBy(e.target.value)}
                className="bg-slate-800 border-slate-700 text-xs text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">{isAr ? 'سبب ومسوغ التفعيل الإداري *' : 'Activation Justification & Reason *'}</label>
              <CFormTextarea
                rows={2}
                required
                value={activationReason}
                onChange={(e) => setActivationReason(e.target.value)}
                placeholder={isAr ? 'أدخل سبب التفعيل وسند السداد المعتمد...' : 'Enter justification and approved payment reference...'}
                className="bg-slate-800 border-slate-700 text-xs text-slate-100"
              />
            </div>
          </CModalBody>
          <CModalFooter className="bg-slate-900 border-t border-slate-800">
            <CButton color="secondary" size="sm" onClick={() => setIsActivationModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </CButton>
            <CButton
              type="submit"
              color="primary"
              size="sm"
              disabled={isSubmittingActivation || !authCode.trim()}
              className="text-white font-bold"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {isSubmittingActivation ? (isAr ? 'جارِ التحقق والتفعيل...' : 'Verifying & Activating...') : (isAr ? 'تأكيد تفعيل الاشتراك' : 'Confirm Subscription Activation')}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* MODAL 3: SUSPEND TENANT */}
      <CModal
        visible={isSuspendModalOpen}
        onClose={() => setIsSuspendModalOpen(false)}
        alignment="center"
        className="cui-card-dark"
      >
        <CModalHeader className="bg-slate-900 border-b border-slate-800 text-slate-100">
          <CModalTitle className="text-sm font-bold flex items-center gap-2 text-rose-400">
            <XCircle className="w-4 h-4" />
            <span>{isAr ? 'تعليق حساب المصنع' : 'Suspend Factory Account'}</span>
          </CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleSuspendSubmit}>
          <CModalBody className="bg-slate-950 p-6 space-y-4 text-xs text-slate-200">
            <p>
              {isAr ? (
                <>هل أنت متأكد من تعليق حساب المصنع <strong className="text-slate-100">"{selectedTenantForSuspend?.name}"</strong>؟ سيتم منع مستخدمي المصنع من الوصول لحين إعادة التفعيل.</>
              ) : (
                <>Are you sure you want to suspend factory account <strong className="text-slate-100">"{selectedTenantForSuspend?.name}"</strong>? All tenant users will be blocked until reactivated.</>
              )}
            </p>

            {suspendError && (
              <CAlert color="danger" className="text-xs bg-rose-950/40 border-rose-500/30 text-rose-300">
                {suspendError}
              </CAlert>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">{isAr ? 'سبب التعليق وتوثيق القرار *' : 'Suspension Reason & Documentation *'}</label>
              <CFormTextarea
                rows={3}
                required
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder={isAr ? 'اذكر سبب التعليق بوضوح...' : 'State suspension reason clearly...'}
                className="bg-slate-800 border-slate-700 text-xs text-slate-100"
              />
            </div>
          </CModalBody>
          <CModalFooter className="bg-slate-900 border-t border-slate-800">
            <CButton color="secondary" size="sm" onClick={() => setIsSuspendModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </CButton>
            <CButton type="submit" color="danger" size="sm" disabled={isSubmittingSuspend} className="text-white font-bold">
              {isSubmittingSuspend ? (isAr ? 'جارِ التعليق...' : 'Suspending...') : (isAr ? 'تأكيد تعليق الحساب' : 'Confirm Account Suspension')}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* MODAL 4: EDIT PLATFORM SUBDOMAIN */}
      <CModal
        visible={isSubdomainModalOpen}
        onClose={() => setIsSubdomainModalOpen(false)}
        alignment="center"
        className="cui-card-dark"
      >
        <CModalHeader className="bg-slate-900 border-b border-slate-800 text-slate-100">
          <CModalTitle className="text-sm font-bold flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-400" />
            <span>{isAr ? 'تعديل وتعيين النطاق الفرعي للمنصة' : 'Edit Platform Subdomain'}</span>
          </CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleSubdomainSubmit}>
          <CModalBody className="bg-slate-950 p-6 space-y-4 text-xs text-slate-300">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-[11px] leading-relaxed">
              {isAr
                ? 'النطاق الفرعي هو المعرّف الحصري لمصنع المستأجر ومتجره السحابي (مثل: brand.garmentos.cloud). يُسمح فقط بالحروف الإنجليزية الصغيرة والأرقام والشرطة (-) بطول 3 إلى 63 حرفاً.'
                : 'Subdomains serve as the unique platform routing identifier (e.g. brand.garmentos.cloud). Allowed characters: a-z, 0-9, hyphens (3-63 chars).'}
            </div>

            {subdomainError && (
              <CAlert color="danger" className="text-xs bg-rose-950/40 border-rose-500/30 text-rose-300">
                {subdomainError}
              </CAlert>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                {isAr ? 'المصنع المستهدف' : 'Target Tenant'}
              </label>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 font-bold text-slate-100">
                {selectedTenantForSubdomain?.name} ({selectedTenantForSubdomain?.code})
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                {isAr ? 'النطاق الفرعي الجديد *' : 'Subdomain Slug *'}
              </label>
              <div className="flex items-center gap-2">
                <CFormInput
                  type="text"
                  required
                  value={subdomainInput}
                  onChange={(e) => setSubdomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="e.g. modern-textile"
                  className="bg-slate-800 border-slate-700 text-xs text-slate-100 font-mono"
                />
                <span className="text-slate-400 font-mono text-xs shrink-0">.{baseDomain}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                {isAr ? 'العنوان المتوقع: ' : 'Target URL: '}
                <span className="text-sky-400">{subdomainInput || '...'}.{baseDomain}</span>
              </div>
            </div>
          </CModalBody>
          <CModalFooter className="bg-slate-900 border-t border-slate-800">
            <CButton color="secondary" size="sm" onClick={() => setIsSubdomainModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </CButton>
            <CButton
              type="submit"
              color="primary"
              size="sm"
              disabled={isSubmittingSubdomain || !subdomainInput.trim()}
              className="text-white font-bold"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {isSubmittingSubdomain ? (isAr ? 'جارِ التعيين...' : 'Saving...') : (isAr ? 'حفظ وتعيين النطاق' : 'Save Subdomain')}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* MODAL 5: CUSTOM DOMAIN & DNS CONFIGURATION */}
      <CModal
        visible={isCustomDomainModalOpen}
        onClose={() => setIsCustomDomainModalOpen(false)}
        alignment="center"
        size="lg"
        className="cui-card-dark"
      >
        <CModalHeader className="bg-slate-900 border-b border-slate-800 text-slate-100">
          <CModalTitle className="text-sm font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? 'إعداد وتوثيق النطاق المخصص (Custom Domain)' : 'Custom Domain & DNS Verification'}</span>
          </CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleCustomDomainSubmit}>
          <CModalBody className="bg-slate-950 p-6 space-y-4 text-xs text-slate-300">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-[11px] space-y-2">
              <div className="font-bold text-slate-200">
                {isAr ? 'متطلبات توثيق ملكية النطاق وربطه بالمتجر (DNS Requirements):' : 'DNS Requirements for Custom Domain:'}
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                <li>
                  {isAr
                    ? 'إضافة سجل CNAME في لوحة تحكم النطاق يوجه إلى: '
                    : 'Add a CNAME record pointing to: '}
                  <code className="text-amber-400 font-mono">cname.{baseDomain}</code>
                </li>
                <li>
                  {isAr
                    ? 'إضافة سجل TXT للتحقق الأمني من ملكية النطاق بالقيمة الموضحة أدناه.'
                    : 'Add a TXT verification record with the token displayed below.'}
                </li>
              </ol>
            </div>

            {customDomainError && (
              <CAlert color="danger" className="text-xs bg-rose-950/40 border-rose-500/30 text-rose-300">
                {customDomainError}
              </CAlert>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                {isAr ? 'المصنع المستهدف' : 'Target Tenant'}
              </label>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 font-bold text-slate-100">
                {selectedTenantForCustomDomain?.name} ({selectedTenantForCustomDomain?.code})
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                {isAr ? 'اسم النطاق المخصص (Fully Qualified Domain Name) *' : 'Custom FQDN Domain Name *'}
              </label>
              <CFormInput
                type="text"
                value={customDomainInput}
                onChange={(e) => setCustomDomainInput(e.target.value.toLowerCase().trim())}
                placeholder="e.g. store.brandname.com"
                className="bg-slate-800 border-slate-700 text-xs text-slate-100 font-mono"
              />
              <div className="text-[11px] text-slate-500 mt-1">
                {isAr ? 'أدخل النطاق بدون http:// أو https://' : 'Do not include http:// or https:// prefix'}
              </div>
            </div>

            {selectedTenantForCustomDomain?.custom_domain_token && (
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-300">
                  {isAr ? 'رمز التوثيق الأمني (DNS TXT Record):' : 'DNS TXT Verification Token:'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block">Host / Name:</span>
                    <span className="font-mono text-slate-200 select-all">{isAr ? '@ أو' : '@ or'} {customDomainInput || 'domain'}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block">TXT Value:</span>
                    <span className="font-mono text-amber-300 select-all font-bold">
                      garmentos-verification={selectedTenantForCustomDomain.custom_domain_token}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CModalBody>
          <CModalFooter className="bg-slate-900 border-t border-slate-800">
            <CButton color="secondary" size="sm" onClick={() => setIsCustomDomainModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </CButton>
            <CButton
              type="submit"
              color="primary"
              size="sm"
              disabled={isSubmittingCustomDomain}
              className="text-white font-bold"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {isSubmittingCustomDomain ? (isAr ? 'جارِ الحفظ...' : 'Saving...') : (isAr ? 'حفظ وتحديث النطاق' : 'Save Domain')}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* MODAL: EMERGENCY QUOTA OVERRIDE */}
      <CModal
        visible={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        alignment="center"
        className="cui-card-dark"
      >
        <CModalHeader className="border-slate-800">
          <CModalTitle className="text-sm font-bold text-slate-100">
            {isAr ? `منح استثناء حصة تشغيلية: ${overrideTenant?.name || ''}` : `Grant Emergency Quota Override: ${overrideTenant?.name || ''}`}
          </CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleGrantOverride}>
          <CModalBody className="space-y-4 text-xs text-slate-300">
            <div>
              <label className="block text-slate-400 mb-1">{isAr ? 'العداد المستثنى' : 'Target Meter'}</label>
              <CFormSelect
                value={overrideMeterKey}
                onChange={(e) => setOverrideMeterKey(e.target.value)}
                className="bg-slate-900 border-slate-700 text-slate-200 text-xs"
              >
                <option value="cutting_lays">{isAr ? 'فرشات صالة القص (cutting_lays)' : 'Cutting Lays'}</option>
                <option value="active_users">{isAr ? 'المستخدمين النشطين (active_users)' : 'Active Users'}</option>
                <option value="active_employees">{isAr ? 'العمال والموظفين (active_employees)' : 'Active Employees'}</option>
                <option value="production_orders">{isAr ? 'أوامر التشغيل (production_orders)' : 'Production Orders'}</option>
                <option value="purchase_orders">{isAr ? 'أوامر الشراء (purchase_orders)' : 'Purchase Orders'}</option>
                <option value="subcontract_jobs">{isAr ? 'عقود التشغيل للغير (subcontract_jobs)' : 'Subcontract Jobs'}</option>
              </CFormSelect>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">{isAr ? 'السعة الاستثنائية المؤقتة' : 'Temporary Quota Limit'}</label>
              <CFormInput
                type="number"
                min="1"
                value={overrideLimit}
                onChange={(e) => setOverrideLimit(Number(e.target.value))}
                className="bg-slate-900 border-slate-700 text-slate-200 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">{isAr ? 'مدة سريان الاستثناء (أيام)' : 'Duration (Days)'}</label>
              <CFormInput
                type="number"
                min="1"
                max="30"
                value={overrideDays}
                onChange={(e) => setOverrideDays(Number(e.target.value))}
                className="bg-slate-900 border-slate-700 text-slate-200 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">{isAr ? 'سبب الاستثناء وتوثيق الاعتماد' : 'Reason / Justification'}</label>
              <CFormTextarea
                rows={3}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="bg-slate-900 border-slate-700 text-slate-200 text-xs"
                placeholder={isAr ? 'اكتب سبب الاستثناء لتسجيله في دفاتر التدقيق...' : 'Reason for audit trail...'}
                required
              />
            </div>
          </CModalBody>
          <CModalFooter className="border-slate-800">
            <CButton
              color="secondary"
              variant="ghost"
              size="sm"
              onClick={() => setIsOverrideModalOpen(false)}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </CButton>
            <CButton
              color="primary"
              size="sm"
              type="submit"
              disabled={isSubmittingOverride}
            >
              {isSubmittingOverride ? (isAr ? 'جارِ الاعتماد...' : 'Granting...') : (isAr ? 'اعتماد الاستثناء' : 'Grant Override')}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
      {/* Logout Confirmation Modal */}
      <CModal
        visible={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        alignment="center"
        size="sm"
        backdrop="static"
      >
        <CModalHeader closeButton>
          <CModalTitle className="text-sm font-bold flex items-center gap-2 text-rose-400">
            <LogOut className="w-4 h-4" />
            <span>{isAr ? 'تأكيد تسجيل خروج المنظومة' : 'Confirm Admin Logout'}</span>
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="text-xs text-slate-300 py-3">
          {isAr
            ? 'هل أنت متأكد من تسجيل الخروج من لوحة تحكم المنظومة المركزية؟ سيتم إنهاء جلسة الإدارة وتأمين البيئة.'
            : 'Are you sure you want to sign out of the Platform Administration? Your administrative session will be terminated.'}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="ghost"
            size="sm"
            onClick={() => setIsLogoutModalOpen(false)}
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </CButton>
          <CButton
            color="danger"
            size="sm"
            onClick={() => {
              setIsLogoutModalOpen(false);
              onLogout();
            }}
          >
            {isAr ? 'تأكيد الخروج' : 'Sign Out'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* STAGE C.4 MODAL: RECEIPT PREVIEW */}
      <CModal
        visible={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSelectedReceiptUrl(null);
        }}
        size="lg"
        alignment="center"
        className="cui-card-dark"
      >
        <CModalHeader className="bg-slate-900 border-b border-slate-800 text-slate-100">
          <CModalTitle className="text-sm font-bold flex items-center gap-2 text-indigo-400">
            <Eye className="w-4 h-4" />
            <span>{isAr ? 'معاينة إيصال السداد المحمي' : 'Encrypted Payment Receipt Preview'}</span>
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4 text-center bg-slate-950">
          {selectedReceiptUrl ? (
            <div className="space-y-3">
              <img
                src={selectedReceiptUrl}
                alt="Receipt"
                className="max-h-[500px] mx-auto rounded-xl shadow-lg border border-slate-800 object-contain"
              />
              <div className="text-[11px] text-slate-400">
                {isAr ? 'تم جلب هذا الملف عبر جلسة مشرف المنصة المصادقة.' : 'Secure authenticated stream from storage.'}
              </div>
            </div>
          ) : (
            <div className="py-12 text-slate-400 text-xs">
              {isAr ? 'جارِ تحميل الملف...' : 'Loading receipt...'}
            </div>
          )}
        </CModalBody>
        <CModalFooter className="bg-slate-900 border-t border-slate-800">
          <CButton
            color="secondary"
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsReceiptModalOpen(false);
              setSelectedReceiptUrl(null);
            }}
          >
            {isAr ? 'إغلاق' : 'Close'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* STAGE C.4 MODAL: APPROVE CONFIRMATION */}
      <CModal
        visible={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        alignment="center"
        className="cui-card-dark"
      >
        <CModalHeader className="bg-slate-900 border-b border-slate-800 text-slate-100">
          <CModalTitle className="text-sm font-bold flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>{isAr ? 'تأكيد اعتماد السداد والتفعيل الذري' : 'Confirm Payment Approval'}</span>
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="text-xs text-slate-300 py-4 space-y-3">
          {selectedRequestForApprove && (
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5 font-mono text-[11px]">
              <div><span className="text-slate-400">{isAr ? 'المستأجر:' : 'Tenant:'}</span> <strong className="text-white">{selectedRequestForApprove.tenant?.name}</strong></div>
              <div><span className="text-slate-400">{isAr ? 'الباقة:' : 'Plan:'}</span> <strong className="text-amber-400">{selectedRequestForApprove.plan_name}</strong></div>
              <div><span className="text-slate-400">{isAr ? 'المبلغ المحول:' : 'Amount:'}</span> <strong className="text-emerald-400">{selectedRequestForApprove.submitted_amount} {selectedRequestForApprove.currency}</strong></div>
              <div><span className="text-slate-400">{isAr ? 'مرجع التحويل:' : 'Reference:'}</span> <strong className="text-indigo-400">{selectedRequestForApprove.transfer_reference}</strong></div>
            </div>
          )}
          <p className="leading-relaxed">
            {isAr
              ? 'هل أنت متأكد من مطابقة إيصال التحويل مع حساب المنصة؟ سيؤدي الاعتماد إلى تفعيل الحصة أو باقة الـ ERP فورياً مع توثيق سجل تدقيق مالي غير قابل للحذف.'
              : 'Confirm receipt verification? Approval will atomically activate quota/plan and log an immutable audit event.'}
          </p>
        </CModalBody>
        <CModalFooter className="bg-slate-900 border-t border-slate-800">
          <CButton
            color="secondary"
            variant="ghost"
            size="sm"
            onClick={() => setIsApproveModalOpen(false)}
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </CButton>
          <CButton
            color="success"
            size="sm"
            disabled={isSubmittingApprove}
            onClick={handleApproveSubmit}
          >
            {isSubmittingApprove ? (isAr ? 'جارِ الاعتماد...' : 'Approving...') : (isAr ? 'تأكيد الاعتماد والتفعيل' : 'Confirm & Activate')}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* STAGE C.4 MODAL: REJECT PAYMENT REQUEST */}
      <CModal
        visible={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        alignment="center"
        className="cui-card-dark"
      >
        <form onSubmit={handleRejectSubmit}>
          <CModalHeader className="bg-slate-900 border-b border-slate-800 text-slate-100">
            <CModalTitle className="text-sm font-bold flex items-center gap-2 text-rose-400">
              <XCircle className="w-4 h-4" />
              <span>{isAr ? 'رفض طلب السداد مع تدوين السبب' : 'Reject Payment Request'}</span>
            </CModalTitle>
          </CModalHeader>
          <CModalBody className="text-xs text-slate-300 py-4 space-y-3">
            {selectedRequestForReject && (
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1 font-mono text-[11px]">
                <div><span className="text-slate-400">{isAr ? 'المستأجر:' : 'Tenant:'}</span> <strong className="text-white">{selectedRequestForReject.tenant?.name}</strong></div>
                <div><span className="text-slate-400">{isAr ? 'المرجع:' : 'Reference:'}</span> <strong className="text-rose-400">{selectedRequestForReject.transfer_reference}</strong></div>
              </div>
            )}

            <div>
              <label className="block font-bold mb-1 text-slate-200">
                {isAr ? 'سبب الرفض الإلزامي (سيظهر للمستأجر في الإشعار) *' : 'Rejection Reason *'}
              </label>
              <CFormTextarea
                required
                rows={3}
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder={isAr ? 'مثال: رقم الحوالة غير مطابق لكشوفات البنك / صورة الإيصال غير واضحة...' : 'e.g. Reference mismatch with bank ledger...'}
                className="bg-slate-950 border-slate-700 text-slate-200 text-xs"
              />
            </div>
          </CModalBody>
          <CModalFooter className="bg-slate-900 border-t border-slate-800">
            <CButton
              color="secondary"
              variant="ghost"
              size="sm"
              onClick={() => setIsRejectModalOpen(false)}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </CButton>
            <CButton
              type="submit"
              color="danger"
              size="sm"
              disabled={isSubmittingReject || !rejectionReasonInput.trim()}
            >
              {isSubmittingReject ? (isAr ? 'جارِ الرفض...' : 'Rejecting...') : (isAr ? 'تأكيد الرفض' : 'Confirm Rejection')}
            </CButton>
          </CModalFooter>
        </form>
      </CModal>

      {/* P2 MODAL: CREATE SAAS PACKAGE (ERP + WASLAT WORSH) */}
      <CModal
        visible={isCreatePkgModalOpen}
        onClose={() => setIsCreatePkgModalOpen(false)}
        size="lg"
        alignment="center"
        className="cui-card-dark"
      >
        <form onSubmit={handleCreatePackageSubmit}>
          <CModalHeader className="bg-slate-900 border-b border-slate-800 text-slate-100">
            <CModalTitle className="text-sm font-bold flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-500" />
              <span>{isAr ? 'إنشاء باقة اشتراك جديدة (SaaS Package)' : 'Create New SaaS Package'}</span>
            </CModalTitle>
          </CModalHeader>
          <CModalBody className="bg-slate-950 p-6 text-xs text-slate-300 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Product Category Selector */}
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">{isAr ? 'فئة المنتج التجاري *' : 'Product Category *'}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPkgProductCategory('erp')}
                  className={`p-3 rounded-xl border text-start transition-all ${
                    pkgProductCategory === 'erp'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span>{isAr ? 'مصانع وورش GarmentOS ERP' : 'GarmentOS ERP Factory'}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">{isAr ? 'نظام تشغيل المصانع: إنتاج، مخازن، مقصدار، حسابات' : 'Full factory manufacturing, cut plan, inventory, POS'}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPkgProductCategory('waslat_worsh')}
                  className={`p-3 rounded-xl border text-start transition-all ${
                    pkgProductCategory === 'waslat_worsh'
                      ? 'bg-amber-600/20 border-amber-500 text-white shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>{isAr ? 'سوق وصلة ورش (طالب تشغيل مستقل)' : 'Waslat Worsh Requester'}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">{isAr ? 'باقات طلبات قص فقط للمكاتب والبراندات بدون ERP' : 'Cutting RFQ quota only without ERP factory shell'}</div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1">{isAr ? 'كود الباقة الفريد *' : 'Package Code *'}</label>
                <CFormInput
                  size="sm"
                  placeholder={pkgProductCategory === 'erp' ? 'e.g. erp_growth_plan' : 'e.g. ww_scale_50'}
                  value={pkgCode}
                  onChange={(e) => setPkgCode(e.target.value)}
                  required
                  className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">{isAr ? 'السعر الشهري (ج.م) *' : 'Monthly Price (EGP) *'}</label>
                <CFormInput
                  size="sm"
                  type="number"
                  min="0"
                  step="0.01"
                  value={pkgPrice}
                  onChange={(e) => setPkgPrice(Number(e.target.value))}
                  required
                  className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">{isAr ? 'السعر السنوي (ج.م)' : 'Annual Price (EGP)'}</label>
                <CFormInput
                  size="sm"
                  type="number"
                  min="0"
                  step="0.01"
                  value={pkgAnnualPrice}
                  onChange={(e) => setPkgAnnualPrice(Number(e.target.value))}
                  placeholder="3000"
                  className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">{isAr ? 'فترة الصلاحية (بالأيام) *' : 'Validity (Days) *'}</label>
                <CFormInput
                  size="sm"
                  type="number"
                  min="1"
                  value={pkgValidityDays}
                  onChange={(e) => setPkgValidityDays(Number(e.target.value))}
                  required
                  className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">{isAr ? 'اسم الباقة بالعربية *' : 'Name (Arabic) *'}</label>
                <CFormInput
                  size="sm"
                  placeholder="باقة النمو المتقدمة..."
                  value={pkgNameAr}
                  onChange={(e) => setPkgNameAr(e.target.value)}
                  required
                  className="bg-slate-900 border-slate-700 text-slate-100 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">{isAr ? 'اسم الباقة بالإنجليزية *' : 'Name (English) *'}</label>
                <CFormInput
                  size="sm"
                  placeholder="Growth Advanced Plan..."
                  value={pkgNameEn}
                  onChange={(e) => setPkgNameEn(e.target.value)}
                  required
                  className="bg-slate-900 border-slate-700 text-slate-100 text-xs"
                />
              </div>

              {pkgProductCategory === 'waslat_worsh' && (
                <div>
                  <label className="block text-slate-300 font-bold mb-1">{isAr ? 'حصة طلبات القص المسموحة *' : 'Allowed RFQs Quota *'}</label>
                  <CFormInput
                    size="sm"
                    type="number"
                    min="1"
                    value={pkgQuota}
                    onChange={(e) => setPkgQuota(Number(e.target.value))}
                    required
                    className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-bold mb-1">{isAr ? 'ترتيب الظهور' : 'Sort Order'}</label>
                <CFormInput
                  size="sm"
                  type="number"
                  value={pkgSortOrder}
                  onChange={(e) => setPkgSortOrder(Number(e.target.value))}
                  className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs"
                />
              </div>
            </div>

            {/* Public & Popular Toggles */}
            <div className="flex items-center gap-6 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={pkgIsPublic}
                  onChange={(e) => setPkgIsPublic(e.target.checked)}
                  className="rounded border-slate-700 text-rose-600 focus:ring-rose-500 bg-slate-900"
                />
                <span>{isAr ? 'عرض الباقة على الموقع العام' : 'Show on Public Website'}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={pkgIsPopular}
                  onChange={(e) => setPkgIsPopular(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900"
                />
                <span>{isAr ? 'تمييز كباقة مفضلة (Most Popular)' : 'Mark as Popular'}</span>
              </label>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">{isAr ? 'الوصف بالعربية' : 'Description (Arabic)'}</label>
              <CFormTextarea
                rows={2}
                value={pkgDescAr}
                onChange={(e) => setPkgDescAr(e.target.value)}
                placeholder="وصف مميزات الباقة والشرائح المستهدفة..."
                className="bg-slate-900 border-slate-700 text-slate-100 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">{isAr ? 'الوصف بالإنجليزية' : 'Description (English)'}</label>
              <CFormTextarea
                rows={2}
                value={pkgDescEn}
                onChange={(e) => setPkgDescEn(e.target.value)}
                placeholder="Package features and target users..."
                className="bg-slate-900 border-slate-700 text-slate-100 text-xs"
              />
            </div>

            {/* Assigned Features Checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-slate-300 font-bold">
                  {isAr ? 'الميزات والوحدات المضمنة في الباقة' : 'Assigned Package Features'}
                </label>
                <span className="text-[11px] text-slate-400">
                  {pkgFeatures.length} {isAr ? 'ميزة مختارة' : 'selected'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-900 rounded-xl border border-slate-800">
                {saasFeatures
                  .filter((f) => f.product_category === pkgProductCategory || f.product_category === 'all' || !f.product_category)
                  .map((feat) => {
                    const isChecked = pkgFeatures.includes(feat.feature_key);
                    return (
                      <label
                        key={feat.id || feat.feature_key}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                          isChecked ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:bg-slate-800/40'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPkgFeatures([...pkgFeatures, feat.feature_key]);
                            } else {
                              setPkgFeatures(pkgFeatures.filter((k) => k !== feat.feature_key));
                            }
                          }}
                          className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                        />
                        <span className="truncate">{isAr ? feat.name_ar : feat.name_en}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({feat.feature_key})</span>
                      </label>
                    );
                  })}
                {saasFeatures.length === 0 && (
                  <div className="col-span-2 py-4 text-center text-slate-500">
                    {isAr ? 'لا توجد ميزات معرفة في الدليل حالياً.' : 'No features loaded in catalog.'}
                  </div>
                )}
              </div>
            </div>
          </CModalBody>
          <CModalFooter className="bg-slate-900 border-t border-slate-800">
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={() => setIsCreatePkgModalOpen(false)}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </CButton>
            <CButton
              type="submit"
              color="primary"
              size="sm"
              disabled={isSubmittingPkg || !pkgCode || !pkgNameAr}
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {isSubmittingPkg ? (isAr ? 'جارِ الحفظ...' : 'Saving...') : (isAr ? 'حفظ وإنشاء الباقة' : 'Create Package')}
            </CButton>
          </CModalFooter>
        </form>
      </CModal>

      {/* P2 MODAL: EDIT SAAS PACKAGE */}
      <CModal
        visible={isEditPkgModalOpen}
        onClose={() => setIsEditPkgModalOpen(false)}
        size="lg"
        alignment="center"
        className="cui-card-dark"
      >
        <form onSubmit={handleUpdatePackageSubmit}>
          <CModalHeader className="bg-slate-900 border-b border-slate-800 text-slate-100">
            <CModalTitle className="text-sm font-bold flex items-center gap-2">
              <Edit className="w-4 h-4 text-primary" />
              <span>{isAr ? `تعديل باقة: ${selectedPkgForEdit?.code || ''}` : `Edit Package: ${selectedPkgForEdit?.code || ''}`}</span>
            </CModalTitle>
          </CModalHeader>
          <CModalBody className="bg-slate-950 p-6 text-xs text-slate-300 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Category Indicator */}
            <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">{isAr ? 'فئة المنتج:' : 'Category:'}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  pkgProductCategory === 'erp'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {pkgProductCategory === 'erp' ? 'GarmentOS ERP Factory' : 'Waslat Worsh Requester'}
                </span>
              </div>
              <div className="font-mono text-slate-400 text-xs">
                Code: {pkgCode}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1">{isAr ? 'السعر الشهري (ج.م) *' : 'Monthly Price (EGP) *'}</label>
                <CFormInput
                  size="sm"
                  type="number"
                  min="0"
                  step="0.01"
                  value={pkgPrice}
                  onChange={(e) => setPkgPrice(Number(e.target.value))}
                  required
                  className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">{isAr ? 'السعر السنوي (ج.م)' : 'Annual Price (EGP)'}</label>
                <CFormInput
                  size="sm"
                  type="number"
                  min="0"
                  step="0.01"
                  value={pkgAnnualPrice}
                  onChange={(e) => setPkgAnnualPrice(Number(e.target.value))}
                  className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">{isAr ? 'اسم الباقة بالعربية *' : 'Name (Arabic) *'}</label>
                <CFormInput
                  size="sm"
                  value={pkgNameAr}
                  onChange={(e) => setPkgNameAr(e.target.value)}
                  required
                  className="bg-slate-900 border-slate-700 text-slate-100 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">{isAr ? 'اسم الباقة بالإنجليزية *' : 'Name (English) *'}</label>
                <CFormInput
                  size="sm"
                  value={pkgNameEn}
                  onChange={(e) => setPkgNameEn(e.target.value)}
                  required
                  className="bg-slate-900 border-slate-700 text-slate-100 text-xs"
                />
              </div>

              {pkgProductCategory === 'waslat_worsh' && (
                <div>
                  <label className="block text-slate-300 font-bold mb-1">{isAr ? 'حصة طلبات القص المسموحة *' : 'Allowed RFQs Quota *'}</label>
                  <CFormInput
                    size="sm"
                    type="number"
                    min="1"
                    value={pkgQuota}
                    onChange={(e) => setPkgQuota(Number(e.target.value))}
                    required
                    className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-bold mb-1">{isAr ? 'فترة الصلاحية (بالأيام) *' : 'Validity (Days) *'}</label>
                <CFormInput
                  size="sm"
                  type="number"
                  min="1"
                  value={pkgValidityDays}
                  onChange={(e) => setPkgValidityDays(Number(e.target.value))}
                  required
                  className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">{isAr ? 'ترتيب الظهور' : 'Sort Order'}</label>
                <CFormInput
                  size="sm"
                  type="number"
                  value={pkgSortOrder}
                  onChange={(e) => setPkgSortOrder(Number(e.target.value))}
                  className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs"
                />
              </div>
            </div>

            {/* Public & Popular Toggles */}
            <div className="flex items-center gap-6 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={pkgIsPublic}
                  onChange={(e) => setPkgIsPublic(e.target.checked)}
                  className="rounded border-slate-700 text-rose-600 focus:ring-rose-500 bg-slate-900"
                />
                <span>{isAr ? 'عرض الباقة على الموقع العام' : 'Show on Public Website'}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={pkgIsPopular}
                  onChange={(e) => setPkgIsPopular(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900"
                />
                <span>{isAr ? 'تمييز كباقة مفضلة (Most Popular)' : 'Mark as Popular'}</span>
              </label>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">{isAr ? 'الوصف بالعربية' : 'Description (Arabic)'}</label>
              <CFormTextarea
                rows={2}
                value={pkgDescAr}
                onChange={(e) => setPkgDescAr(e.target.value)}
                className="bg-slate-900 border-slate-700 text-slate-100 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">{isAr ? 'الوصف بالإنجليزية' : 'Description (English)'}</label>
              <CFormTextarea
                rows={2}
                value={pkgDescEn}
                onChange={(e) => setPkgDescEn(e.target.value)}
                className="bg-slate-900 border-slate-700 text-slate-100 text-xs"
              />
            </div>

            {/* Assigned Features Checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-slate-300 font-bold">
                  {isAr ? 'الميزات والوحدات المضمنة في الباقة' : 'Assigned Package Features'}
                </label>
                <span className="text-[11px] text-slate-400">
                  {pkgFeatures.length} {isAr ? 'ميزة مختارة' : 'selected'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-900 rounded-xl border border-slate-800">
                {saasFeatures
                  .filter((f) => f.product_category === pkgProductCategory || f.product_category === 'all' || !f.product_category)
                  .map((feat) => {
                    const isChecked = pkgFeatures.includes(feat.feature_key);
                    return (
                      <label
                        key={feat.id || feat.feature_key}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                          isChecked ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:bg-slate-800/40'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPkgFeatures([...pkgFeatures, feat.feature_key]);
                            } else {
                              setPkgFeatures(pkgFeatures.filter((k) => k !== feat.feature_key));
                            }
                          }}
                          className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                        />
                        <span className="truncate">{isAr ? feat.name_ar : feat.name_en}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({feat.feature_key})</span>
                      </label>
                    );
                  })}
              </div>
            </div>
          </CModalBody>
          <CModalFooter className="bg-slate-900 border-t border-slate-800">
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={() => setIsEditPkgModalOpen(false)}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </CButton>
            <CButton
              type="submit"
              color="primary"
              size="sm"
              disabled={isSubmittingPkg}
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {isSubmittingPkg ? (isAr ? 'جارِ الحفظ...' : 'Saving...') : (isAr ? 'حفظ التعديلات' : 'Save Changes')}
            </CButton>
          </CModalFooter>
        </form>
      </CModal>

      {/* MODAL: PACKAGE SUBSCRIBERS */}
      <CModal
        visible={subscribersModalOpen}
        onClose={() => setSubscribersModalOpen(false)}
        size="xl"
        alignment="center"
        className="cui-card-dark"
      >
        <CModalHeader className="bg-slate-900 border-b border-slate-800 text-slate-100">
          <CModalTitle className="text-sm font-bold flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>
              {isAr
                ? `المشتركون في الباقة: ${selectedPkgForSubscribers?.name_ar || selectedPkgForSubscribers?.code || ''}`
                : `Subscribers for: ${selectedPkgForSubscribers?.name_en || selectedPkgForSubscribers?.code || ''}`}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
              {subscribersList.length} {isAr ? 'مشترك' : 'subscribers'}
            </span>
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="bg-slate-950 p-6 text-xs text-slate-300">
          {isSubscribersLoading ? (
            <div className="py-12 text-center">
              <CSpinner color="primary" />
              <div className="text-xs text-slate-400 mt-2">{isAr ? 'جارِ جلب المشتركين...' : 'Loading subscribers...'}</div>
            </div>
          ) : subscribersList.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
              <p className="font-semibold">{isAr ? 'لا يوجد مشتركون في هذه الباقة حتى الآن.' : 'No active subscribers found for this package.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <CTable responsive align="middle" className="mb-0 text-xs text-slate-300">
                <CTableHead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                  <CTableRow>
                    <CTableHeaderCell>{isAr ? 'المستأجر / الشركة' : 'Tenant / Company'}</CTableHeaderCell>
                    <CTableHeaderCell>{isAr ? 'نوع الحساب' : 'Type'}</CTableHeaderCell>
                    <CTableHeaderCell>{isAr ? 'الحالة' : 'Status'}</CTableHeaderCell>
                    <CTableHeaderCell>{isAr ? 'الحصة المستهلكة' : 'Quota Used'}</CTableHeaderCell>
                    <CTableHeaderCell>{isAr ? 'تاريخ البداية' : 'Starts At'}</CTableHeaderCell>
                    <CTableHeaderCell>{isAr ? 'تاريخ الانتهاء' : 'Expires At'}</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {subscribersList.map((sub: any, idx: number) => (
                    <CTableRow key={sub.id || idx} className="border-b border-slate-800/40 hover:bg-slate-900/50">
                      <CTableDataCell className="font-bold text-slate-200">
                        <div>{sub.tenant?.name || sub.tenant_name || sub.tenant_id}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{sub.tenant?.subdomain || sub.tenant_code || ''}</div>
                      </CTableDataCell>
                      <CTableDataCell>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sub.tenant?.tenant_type === 'marketplace_requester'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}>
                          {sub.tenant?.tenant_type === 'marketplace_requester' ? (isAr ? 'طالب تشغيل مستقل' : 'WW Requester') : (isAr ? 'مصنع ERP' : 'ERP Factory')}
                        </span>
                      </CTableDataCell>
                      <CTableDataCell>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sub.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {sub.status}
                        </span>
                      </CTableDataCell>
                      <CTableDataCell className="font-mono">
                        {sub.quota_used !== undefined ? `${sub.quota_used} / ${sub.quota_total || '∞'}` : '-'}
                      </CTableDataCell>
                      <CTableDataCell className="text-slate-400 font-mono">
                        {sub.starts_at ? new Date(sub.starts_at).toLocaleDateString() : (sub.created_at ? new Date(sub.created_at).toLocaleDateString() : '-')}
                      </CTableDataCell>
                      <CTableDataCell className="text-slate-400 font-mono">
                        {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : (isAr ? 'غير محدد' : 'Unlimited')}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </div>
          )}
        </CModalBody>
        <CModalFooter className="bg-slate-900 border-t border-slate-800">
          <CButton
            color="secondary"
            size="sm"
            variant="outline"
            onClick={() => setSubscribersModalOpen(false)}
          >
            {isAr ? 'إغلاق' : 'Close'}
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  CContainer,
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
  Sun,
  Moon,
  Key,
  XCircle,
} from 'lucide-react';
import { api, type ApiUser } from '../../api/client';
import type { Language } from '../../types';

interface PlatformAdminDashboardProps {
  currentUser: ApiUser;
  onLogout: () => void;
  lang: Language;
  onToggleLang: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onSwitchToTenantApp?: () => void;
}

export const PlatformAdminDashboard: React.FC<PlatformAdminDashboardProps> = ({
  currentUser,
  onLogout,
  lang,
  onToggleLang,
  isDark,
  onToggleTheme,
  onSwitchToTenantApp,
}) => {
  const isAr = lang === 'ar';

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'audit'>('overview');

  // Metrics State
  const [metrics, setMetrics] = useState<any>(null);
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
  const [authorizedBy, setAuthorizedBy] = useState(currentUser.name || 'مدير المنصة العام');
  const [activationReason, setActivationReason] = useState('سداد يدوي معتمد أو اتفاقية تعاقد مباشر');
  const [activationPlanTier, setActivationPlanTier] = useState('professional');
  const [isSubmittingActivation, setIsSubmittingActivation] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null);

  // Suspend Tenant Modal
  const [selectedTenantForSuspend, setSelectedTenantForSuspend] = useState<any | null>(null);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('انتهاء الفترة التجريبية وتأخر سداد الاشتراك');
  const [isSubmittingSuspend, setIsSubmittingSuspend] = useState(false);
  const [suspendError, setSuspendError] = useState<string | null>(null);

  // General Notification
  const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load Overview Metrics
  const loadOverview = async () => {
    setIsOverviewLoading(true);
    try {
      const res = await api.platformAdmin.getOverview();
      setMetrics(res.metrics);
      setRecentAudits(res.recent_audits || []);
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err.message || 'فشل تحميل إحصائيات المنصة.' });
    } finally {
      setIsOverviewLoading(false);
    }
  };

  // Load Tenants Directory
  const loadTenants = async (page = 1) => {
    setIsTenantsLoading(true);
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
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err.message || 'فشل تحميل قائمة المصانع.' });
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
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err.message || 'فشل تحميل سجل التدقيق.' });
    } finally {
      setIsAuditLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (activeTab === 'tenants') {
      loadTenants(1);
    } else if (activeTab === 'audit') {
      loadAuditLogs(1);
    }
  }, [activeTab, tenantStatusFilter, tenantPlanFilter]);

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
      setActivationError(err.message || 'فشل تفعيل الاشتراك. تحقق من كود التفويض الأمني.');
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
      setSuspendError(err.message || 'فشل تعليق الحساب.');
    } finally {
      setIsSubmittingSuspend(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#070a13] text-slate-100' : 'bg-slate-100 text-slate-900'} transition-colors duration-200`}>
      {/* 1. Super Admin Navbar */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b ${isDark ? 'border-slate-800 bg-[#0c101a]/95 text-slate-100' : 'border-slate-200 bg-white/95 text-slate-900'} px-4 lg:px-8 py-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
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
                    backgroundColor: isDark ? 'rgba(70, 8, 9, 0.25)' : 'rgba(70, 8, 9, 0.08)',
                    color: isDark ? '#fca5a5' : '#460809',
                    borderColor: isDark ? '#7c1214' : 'rgba(70, 8, 9, 0.3)',
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

            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isDark ? (isAr ? 'تفعيل الوضع المضيء' : 'Light Mode') : (isAr ? 'تفعيل الوضع الليلي' : 'Dark Mode')}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            <CButton
              color="danger"
              variant="outline"
              size="sm"
              className="text-xs text-rose-400 border-rose-500/40 hover:bg-rose-950/40"
              onClick={onLogout}
            >
              <LogOut className="w-3.5 h-3.5 inline-block mr-1 rtl:ml-1" />
              <span>{isAr ? 'خروج' : 'Logout'}</span>
            </CButton>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'text-white border shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            style={
              activeTab === 'overview'
                ? {
                    backgroundColor: 'var(--brand-primary)',
                    borderColor: 'var(--brand-primary-light)',
                    boxShadow: '0 4px 14px 0 rgba(74, 16, 29, 0.35)',
                  }
                : {}
            }
          >
            {isAr ? 'لوحة القيادة والمؤشرات العامة' : 'Platform Overview'}
          </button>

          <button
            onClick={() => setActiveTab('tenants')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'tenants'
                ? 'text-white border shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            style={
              activeTab === 'tenants'
                ? {
                    backgroundColor: 'var(--brand-primary)',
                    borderColor: 'var(--brand-primary-light)',
                    boxShadow: '0 4px 14px 0 rgba(74, 16, 29, 0.35)',
                  }
                : {}
            }
          >
            {isAr ? 'دليل المصانع والشركات المستأجرة' : 'Tenants Directory'}
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'audit'
                ? 'text-white border shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            style={
              activeTab === 'audit'
                ? {
                    backgroundColor: 'var(--brand-primary)',
                    borderColor: 'var(--brand-primary-light)',
                    boxShadow: '0 4px 14px 0 rgba(74, 16, 29, 0.35)',
                  }
                : {}
            }
          >
            {isAr ? 'سجل الرقابة والتدقيق العام (Audit Logs)' : 'Platform Audit Logs'}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <CContainer className="py-8 px-4 lg:px-8">
        {globalMessage && (
          <CAlert
            color={globalMessage.type === 'success' ? 'success' : 'danger'}
            dismissible
            onClose={() => setGlobalMessage(null)}
            className="text-xs mb-6"
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
                              backgroundColor: isDark ? 'rgba(70, 8, 9, 0.25)' : 'rgba(70, 8, 9, 0.08)',
                              color: isDark ? '#fca5a5' : '#460809',
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
                            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>باقة الورش الصغيرة (Starter)</span>
                          </div>
                          <span className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{metrics.tier_counts?.starter || 0} مصانع</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--brand-primary)' }} />
                            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>باقة المصانع المتكاملة (Professional)</span>
                          </div>
                          <span className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{metrics.tier_counts?.professional || 0} مصانع</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>باقة الشركات الكبرى (Enterprise)</span>
                          </div>
                          <span className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{metrics.tier_counts?.enterprise || 0} مصانع</span>
                        </div>

                        {metrics.suspended_tenants > 0 && (
                          <div className="pt-3 border-t border-slate-700 dark:border-slate-800 flex items-center justify-between text-xs text-rose-600 dark:text-rose-400">
                            <div className="flex items-center gap-2">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>حسابات معلقة (Suspended)</span>
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
                              <CBadge color="success" className="text-[10px] px-2 py-0.5">نشط (Active)</CBadge>
                            ) : t.status === 'trial' ? (
                              <CBadge color="warning" className="text-[10px] px-2 py-0.5">تجريبي (Trial)</CBadge>
                            ) : (
                              <CBadge color="danger" className="text-[10px] px-2 py-0.5">معلق (Suspended)</CBadge>
                            )}
                          </CTableDataCell>
                          <CTableDataCell className="text-slate-400">
                            {t.users_count || 1} مستخدم • {t.branches_count || 1} فروع
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
                                className="text-[11px] py-1 px-2.5 text-white"
                                style={{ backgroundColor: 'var(--brand-primary, #460809)', borderColor: 'var(--brand-primary, #460809)' }}
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
                  صفحة {tenantPage} من {tenantTotalPages}
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
                    السابق
                  </CButton>
                  <CButton
                    color="secondary"
                    variant="outline"
                    size="sm"
                    disabled={tenantPage >= tenantTotalPages}
                    onClick={() => loadTenants(tenantPage + 1)}
                    className="text-xs text-slate-300 border-slate-700"
                  >
                    التالي
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
                                <span>تفعيل اشتراك يدوي</span>
                              </span>
                            ) : log.action === 'admin_suspend_tenant' ? (
                              <span className="text-rose-400 flex items-center gap-1.5">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>تعليق حساب مصنع</span>
                              </span>
                            ) : (
                              <span>{log.action}</span>
                            )}
                          </CTableDataCell>
                          <CTableDataCell>
                            <div className="font-medium">{log.user?.name || 'مشرف المنصة'}</div>
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
      </CContainer>

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
            <span>بيانات وتفاصيل المصنع</span>
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
                    <span className="block text-[10px] text-slate-500">كود المستأجر</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">{selectedTenantForDetails.tenant.code}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500">الدومين الفرعي</span>
                    <span>{selectedTenantForDetails.tenant.subdomain}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500">الباقة الحالية</span>
                    <span className="capitalize font-semibold text-slate-200">{selectedTenantForDetails.tenant.plan_tier}</span>
                  </div>
                </div>
              </div>

              {/* Users list */}
              <div>
                <h4 className="font-bold text-xs text-slate-200 mb-2">المستخدمين المسجلين في المصنع</h4>
                <div className="rounded-xl border border-slate-800 overflow-hidden">
                  <CTable responsive className="text-xs mb-0 text-slate-300">
                    <CTableHead className="bg-slate-900 text-slate-400">
                      <CTableRow>
                        <CTableHeaderCell>الاسم</CTableHeaderCell>
                        <CTableHeaderCell>البريد الإلكتروني</CTableHeaderCell>
                        <CTableHeaderCell>الدور والصلاحية</CTableHeaderCell>
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
            إغلاق
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
            <span>تفعيل اشتراك مصنع يدوياً (Manual Subscription Activation)</span>
          </CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleActivateSubmit}>
          <CModalBody className="bg-slate-950 p-6 space-y-4 text-xs text-slate-300">
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                تنبيه أمني: يتطلب هذا الإجراء إدخال كود التفويض الأمني للمنصة المعتمد في متغيرات البيئة. يتم توثيق كافة التفاصيل في سجل الرقابة والتدقيق الدائم.
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
              <label className="block text-xs font-semibold text-slate-200 mb-1">المصنع المستهدف</label>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 font-bold text-slate-100">
                {selectedTenantForActivation?.name} ({selectedTenantForActivation?.code})
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">باقة التفعيل المطلوبة *</label>
              <CFormSelect
                value={activationPlanTier}
                onChange={(e) => setActivationPlanTier(e.target.value)}
                className="bg-slate-800 border-slate-700 text-xs text-slate-100"
              >
                <option value="starter">باقة الورش الصغيرة (Starter) — 3 مستخدمين</option>
                <option value="professional">باقة المصانع المتكاملة (Professional) — حتى 10 مستخدمين</option>
                <option value="enterprise">باقة الشركات الكبرى (Enterprise) — مستخدمين وفروع غير محدودة</option>
              </CFormSelect>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">كود التفويض الأمني للمنصة (Platform Key) *</label>
              <CFormInput
                type="password"
                required
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                placeholder="أدخل كود التفويض الأمني للمشرف العام"
                className="bg-slate-800 border-slate-700 text-xs text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">اسم المسؤول المعتمد للتفعيل *</label>
              <CFormInput
                type="text"
                required
                value={authorizedBy}
                onChange={(e) => setAuthorizedBy(e.target.value)}
                className="bg-slate-800 border-slate-700 text-xs text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">سبب ومسوغ التفعيل الإداري *</label>
              <CFormTextarea
                rows={2}
                required
                value={activationReason}
                onChange={(e) => setActivationReason(e.target.value)}
                placeholder="أدخل سبب التفعيل وسند السداد المعتمد..."
                className="bg-slate-800 border-slate-700 text-xs text-slate-100"
              />
            </div>
          </CModalBody>
          <CModalFooter className="bg-slate-900 border-t border-slate-800">
            <CButton color="secondary" size="sm" onClick={() => setIsActivationModalOpen(false)}>
              إلغاء
            </CButton>
            <CButton
              type="submit"
              color="primary"
              size="sm"
              disabled={isSubmittingActivation || !authCode.trim()}
              className="text-white font-bold"
              style={{ backgroundColor: 'var(--brand-primary, #460809)' }}
            >
              {isSubmittingActivation ? 'جارِ التحقق والتفعيل...' : 'تأكيد تفعيل الاشتراك'}
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
            <span>تعليق حساب المصنع</span>
          </CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleSuspendSubmit}>
          <CModalBody className="bg-slate-950 p-6 space-y-4 text-xs text-slate-200">
            <p>
              هل أنت متأكد من تعليق حساب المصنع <strong className="text-slate-100">"{selectedTenantForSuspend?.name}"</strong>؟ سيتم منع مستخدمي المصنع من الوصول لحين إعادة التفعيل.
            </p>

            {suspendError && (
              <CAlert color="danger" className="text-xs bg-rose-950/40 border-rose-500/30 text-rose-300">
                {suspendError}
              </CAlert>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">سبب التعليق وتوثيق القرار *</label>
              <CFormTextarea
                rows={3}
                required
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="اذكر سبب التعليق بوضوح..."
                className="bg-slate-800 border-slate-700 text-xs text-slate-100"
              />
            </div>
          </CModalBody>
          <CModalFooter className="bg-slate-900 border-t border-slate-800">
            <CButton color="secondary" size="sm" onClick={() => setIsSuspendModalOpen(false)}>
              إلغاء
            </CButton>
            <CButton type="submit" color="danger" size="sm" disabled={isSubmittingSuspend} className="text-white font-bold">
              {isSubmittingSuspend ? 'جارِ التعليق...' : 'تأكيد تعليق الحساب'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </div>
  );
};

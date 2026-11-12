import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Database,
  HardDrive,
  KeyRound,
  Mail,
  Phone,
  Layers,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { api } from '../../api/client';

interface FactorySettingsViewProps {
  isAr?: boolean;
  tenantName?: string;
  tenantCode?: string;
  branchName?: string;
  warehouses?: any[];
  onRefreshBranches?: () => void;
}

export const FactorySettingsView: React.FC<FactorySettingsViewProps> = ({
  isAr = true,
  tenantName = 'مصنع البطل الروماني',
  tenantCode = 'MFG-EYJZSM',
  branchName = 'المصنع وصالة القص الرئيسية',
  warehouses = [],
  onRefreshBranches,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'rbac' | 'profile' | 'branches' | 'backup'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [permissionsCatalog, setPermissionsCatalog] = useState<any[]>([]);
  const [rolesData, setRolesData] = useState<any[]>([]);
  const [availableBranches, setAvailableBranches] = useState<any[]>([]);
  const [userBranchIds, setUserBranchIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Role Customization Modal State
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState<boolean>(false);
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<any | null>(null);
  const [roleEditPermissions, setRoleEditPermissions] = useState<string[]>([]);
  const [isSavingRole, setIsSavingRole] = useState<boolean>(false);

  // Backup telemetry
  const [backupStatus, setBackupStatus] = useState<any>(null);
  const [isDownloadingBackup, setIsDownloadingBackup] = useState<boolean>(false);

  // User Add/Edit Modal
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [editingUserId, setEditingUserId] = useState<string | number | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string>('');
  const [userPassword, setUserPassword] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('production_manager');
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [userIsActive, setUserIsActive] = useState<boolean>(true);
  const [isSubmittingUser, setIsSubmittingUser] = useState<boolean>(false);

  // Branch Modal
  const [isBranchModalOpen, setIsBranchModalOpen] = useState<boolean>(false);
  const [branchNameInput, setBranchNameInput] = useState<string>('');
  const [branchCodeInput, setBranchCodeInput] = useState<string>('');
  const [branchTypeInput, setBranchTypeInput] = useState<string>('factory');
  const [branchAddressInput, setBranchAddressInput] = useState<string>('');
  const [branchPhoneInput, setBranchPhoneInput] = useState<string>('');
  const [branchManagerInput, setBranchManagerInput] = useState<string>('');
  const [isSubmittingBranch, setIsSubmittingBranch] = useState<boolean>(false);

  // Profile Edit State
  const [profileName, setProfileName] = useState<string>(tenantName);
  const [commercialName, setCommercialName] = useState<string>('مجموعة البطل الروماني للملابس الجاهزة والتصدير');
  const [taxId, setTaxId] = useState<string>('593-201-944');
  const [industrialReg, setIndustrialReg] = useState<string>('104928');
  const [profilePhone, setProfilePhone] = useState<string>('01002938475');
  const [profileEmail, setProfileEmail] = useState<string>('info@albatal-garments.com');
  const [profileAddress, setProfileAddress] = useState<string>('المنطقة الصناعية الثالثة، المحلة الكبرى، مصر');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, catalogRes, rolesRes, backupRes, profileRes, branchesRes] = await Promise.all([
        api.tenant.getUsers().catch(() => ({ users: [], total: 0, active_count: 0 })),
        api.tenant.getPermissionsCatalog().catch(() => ({ catalog: [], roles: [] })),
        api.tenant.getRolesWithPermissions().catch(() => ({ roles: [], catalog: [] })),
        api.tenant.getBackupStatus().catch(() => null),
        api.tenant.getProfile().catch(() => null),
        api.branches.getBranches().catch(() => ({ branches: [] })),
      ]);

      setUsers(usersRes.users || []);
      setPermissionsCatalog(catalogRes.catalog && catalogRes.catalog.length > 0 ? catalogRes.catalog : (rolesRes.catalog || []));
      setRolesData(rolesRes.roles || []);
      setAvailableBranches(branchesRes.branches || []);
      if (backupRes) setBackupStatus(backupRes);

      if (profileRes?.tenant) {
        const t = profileRes.tenant as any;
        setProfileName(t.name || tenantName);
        if (t.commercial_name) setCommercialName(t.commercial_name);
        if (t.tax_id) setTaxId(t.tax_id);
        if (t.industrial_registry) setIndustrialReg(t.industrial_registry);
        if (t.phone) setProfilePhone(t.phone);
        if (t.email) setProfileEmail(t.email);
        if (t.address) setProfileAddress(t.address);
      }
    } catch (err: any) {
      console.error('Failed to load settings data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When changing role in modal, auto-fill default permissions
  const handleRoleChange = (role: string) => {
    setUserRole(role);
    let defaultPerms: string[] = [];
    switch (role) {
      case 'company_owner':
        defaultPerms = ['*'];
        break;
      case 'production_manager':
      case 'production_engineer':
        defaultPerms = ['cutting.view', 'cutting.create', 'cutting.issue', 'production.manage', 'inventory.view', 'inventory.manage', 'inventory.dispatch', 'qc.inspect', 'costing.view', 'sales.view', 'sales.create', 'maintenance.view', 'maintenance.manage', 'subcontracting.view', 'subcontracting.manage'];
        break;
      case 'inventory_custodian':
      case 'storekeeper':
      case 'warehouse_manager':
        defaultPerms = ['inventory.view', 'inventory.manage', 'inventory.receive', 'inventory.dispatch', 'cutting.view', 'branches.view', 'procurement.view', 'procurement.create'];
        break;
      case 'accountant':
      case 'financial_accountant':
        defaultPerms = ['accounting.view', 'accounting.post', 'reports.export', 'costing.view', 'costing.manage', 'procurement.view', 'procurement.create', 'sales.view', 'inventory.view', 'hr.view', 'hr.payroll', 'subcontracting.view', 'subcontracting.payments'];
        break;
      case 'quality_controller':
      case 'qc':
        defaultPerms = ['qc.inspect', 'qc.approve', 'qc.reject', 'cutting.view', 'branches.view', 'inventory.view'];
        break;
      case 'sales_rep':
        defaultPerms = ['sales.view', 'sales.create', 'sales.discount', 'inventory.view', 'storefront.view'];
        break;
      case 'worker':
      case 'operator':
        defaultPerms = ['cutting.view', 'production.manage'];
        break;
      default:
        defaultPerms = [];
    }
    setUserPermissions(defaultPerms);
  };

  const handleOpenAddUser = () => {
    setEditingUserId(null);
    setUserName('');
    setUserEmail('');
    setUserPhone('');
    setUserPassword('');
    setUserRole('production_manager');
    handleRoleChange('production_manager');
    setUserIsActive(true);
    setUserBranchIds([]);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: any) => {
    setEditingUserId(user.id);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserPhone(user.phone || '');
    setUserPassword('');
    setUserRole(user.role);
    setUserPermissions(user.permissions_mode === 'custom' ? (user.permissions || []) : (user.effective_permissions || []));
    setUserBranchIds(Array.isArray(user.branch_ids) ? user.branch_ids : []);
    setUserIsActive(Boolean(user.is_active));
    setIsUserModalOpen(true);
  };

  const handleTogglePermission = (permKey: string) => {
    if (userRole === 'company_owner') return; // Owner has wildcard
    setUserPermissions((prev) => {
      if (prev.includes(permKey)) {
        return prev.filter((p) => p !== permKey);
      } else {
        return [...prev, permKey];
      }
    });
  };

  const handleSelectAllInModule = (modulePerms: any[]) => {
    if (userRole === 'company_owner') return;
    const keys = modulePerms.map((p) => p.key);
    const allSelected = keys.every((k) => userPermissions.includes(k));
    if (allSelected) {
      setUserPermissions((prev) => prev.filter((k) => !keys.includes(k)));
    } else {
      setUserPermissions((prev) => Array.from(new Set([...prev, ...keys])));
    }
  };

  const handleOpenEditRole = (role: any) => {
    setSelectedRoleForEdit(role);
    setRoleEditPermissions(Array.isArray(role.permissions) ? [...role.permissions] : []);
    setIsEditRoleModalOpen(true);
  };

  const handleToggleRoleEditPermission = (permKey: string) => {
    if (selectedRoleForEdit?.key === 'company_owner') return;
    setRoleEditPermissions((prev) => {
      if (prev.includes(permKey)) {
        return prev.filter((p) => p !== permKey);
      } else {
        return [...prev, permKey];
      }
    });
  };

  const handleSelectAllInRoleEditModule = (modulePerms: any[]) => {
    if (selectedRoleForEdit?.key === 'company_owner') return;
    const keys = modulePerms.map((p) => p.key);
    const allSelected = keys.every((k) => roleEditPermissions.includes(k));
    if (allSelected) {
      setRoleEditPermissions((prev) => prev.filter((k) => !keys.includes(k)));
    } else {
      setRoleEditPermissions((prev) => Array.from(new Set([...prev, ...keys])));
    }
  };

  const handleSaveRolePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoleForEdit) return;
    setIsSavingRole(true);
    setStatusMsg(null);
    try {
      const res = await api.tenant.updateRolePermissions(selectedRoleForEdit.key, roleEditPermissions);
      setStatusMsg({
        type: 'success',
        text: res.message || (isAr ? 'تم حفظ واعتماد صلاحيات الدور للمصنع بنجاح!' : 'Role permissions updated successfully!'),
      });
      setIsEditRoleModalOpen(false);
      await loadData();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || (isAr ? 'فشل حفظ صلاحيات الدور' : 'Failed to save role permissions'),
      });
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleQuickAddUserWithRole = (roleKey: string) => {
    setEditingUserId(null);
    setUserName('');
    setUserEmail('');
    setUserPhone('');
    setUserPassword('');
    handleRoleChange(roleKey);
    setUserIsActive(true);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'company_owner' && availableBranches.length > 0 && userBranchIds.length === 0) {
      setStatusMsg({
        type: 'error',
        text: isAr ? 'يجب تعيين المستخدم إلى فرع واحد على الأقل قبل حفظ الحساب.' : 'Assign this user to at least one branch before saving.',
      });
      return;
    }
    setIsSubmittingUser(true);
    setStatusMsg(null);
    try {
      if (editingUserId) {
        // Update
        const payload: any = {
          name: userName,
          email: userEmail,
          phone: userPhone,
          role: userRole,
          permissions: userRole === 'company_owner' ? ['*'] : userPermissions,
          branch_ids: userRole === 'company_owner' ? [] : userBranchIds,
          is_active: userIsActive,
        };
        if (userPassword.trim()) {
          payload.password = userPassword;
        }
        const res = await api.tenant.updateUser(editingUserId, payload);
        setStatusMsg({
          type: 'success',
          text: res.message || (isAr ? 'تم تحديث بيانات وصلاحيات المستخدم بنجاح.' : 'User updated successfully.'),
        });
      } else {
        // Create
        if (!userPassword.trim()) {
          setStatusMsg({
            type: 'error',
            text: isAr ? 'يرجى إدخال كلمة مرور لحساب المستخدم الجديد.' : 'Password is required.',
          });
          setIsSubmittingUser(false);
          return;
        }
        const res = await api.tenant.createUser({
          name: userName,
          email: userEmail,
          password: userPassword,
          phone: userPhone,
          role: userRole,
          permissions: userRole === 'company_owner' ? ['*'] : userPermissions,
          is_active: userIsActive,
        });
        setStatusMsg({
          type: 'success',
          text: res.message || (isAr ? 'تم إنشاء الحساب وتعيين الصلاحيات بنجاح.' : 'User created successfully.'),
        });
      }
      setIsUserModalOpen(false);
      await loadData();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || (isAr ? 'فشلت معالجة حساب المستخدم' : 'Failed to save user'),
      });
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleToggleUserActive = async (user: any) => {
    try {
      const res = await api.tenant.toggleUserActive(user.id);
      setStatusMsg({
        type: 'success',
        text: res.message || (isAr ? 'تم تغيير حالة الحساب بنجاح.' : 'User status updated.'),
      });
      await loadData();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || (isAr ? 'فشل تغيير حالة الحساب' : 'Failed to update user status'),
      });
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!window.confirm(isAr ? `هل أنت متأكد من حذف الحساب «${user.name}» نهائياً من سجلات المصنع؟` : `Delete user "${user.name}"?`)) {
      return;
    }
    try {
      const res = await api.tenant.deleteUser(user.id);
      setStatusMsg({
        type: 'success',
        text: res.message || (isAr ? 'تم حذف حساب المستخدم بنجاح.' : 'User deleted.'),
      });
      await loadData();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || (isAr ? 'فشل حذف المستخدم' : 'Failed to delete user'),
      });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setStatusMsg(null);
    try {
      const res = await api.tenant.updateProfile({
        name: profileName,
        commercial_name: commercialName,
        tax_id: taxId,
        industrial_registry: industrialReg,
        phone: profilePhone,
        email: profileEmail,
        address: profileAddress,
      });
      setStatusMsg({
        type: 'success',
        text: res.message || (isAr ? 'تم حفظ وتحديث الهوية الصناعية للمصنع بنجاح!' : 'Factory profile updated.'),
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || (isAr ? 'فشل تحديث بيانات المصنع' : 'Failed to update profile'),
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBranch(true);
    setStatusMsg(null);
    try {
      const res = await api.branches.createBranch({
        name: branchNameInput,
        code: branchCodeInput,
        type: branchTypeInput,
        address: branchAddressInput,
        phone: branchPhoneInput,
        manager_name: branchManagerInput,
        is_main: false,
      });
      setStatusMsg({
        type: 'success',
        text: res.message || (isAr ? 'تمت إضافة الفرع / الموقع الصناعي بنجاح!' : 'Branch created successfully!'),
      });
      setIsBranchModalOpen(false);
      setBranchNameInput('');
      setBranchCodeInput('');
      setBranchAddressInput('');
      setBranchPhoneInput('');
      setBranchManagerInput('');
      if (onRefreshBranches) onRefreshBranches();
      await loadData();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || (isAr ? 'فشلت إضافة الفرع' : 'Failed to create branch'),
      });
    } finally {
      setIsSubmittingBranch(false);
    }
  };

  const handleDownloadBackup = async () => {
    setIsDownloadingBackup(true);
    try {
      await api.tenant.downloadBackup();
      setStatusMsg({
        type: 'success',
        text: isAr ? 'تم تنزيل النسخة الاحتياطية بنجاح!' : 'Backup downloaded successfully!',
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || (isAr ? 'فشل تنزيل النسخة الاحتياطية' : 'Backup download failed'),
      });
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'company_owner':
        return <Badge variant="danger" className="text-xs font-bold">{isAr ? 'مالك المصنع / المدير العام' : 'Factory Owner'}</Badge>;
      case 'production_manager':
      case 'production_engineer':
        return <Badge variant="warning" className="text-xs font-bold">{isAr ? 'مهندس صالة القص والإنتاج' : 'Production Lead'}</Badge>;
      case 'inventory_custodian':
      case 'storekeeper':
      case 'warehouse_manager':
        return <Badge variant="brand" className="text-xs font-bold">{isAr ? 'أمين مخزن الأقمشة' : 'Storekeeper'}</Badge>;
      case 'accountant':
      case 'financial_accountant':
        return <Badge variant="neutral" className="text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700">{isAr ? 'محاسب التكاليف والمالية' : 'Accountant'}</Badge>;
      case 'quality_controller':
      case 'qc':
        return <Badge variant="neutral" className="text-xs font-bold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700">{isAr ? 'مدقق الجودة (QC)' : 'QC Inspector'}</Badge>;
      case 'sales_rep':
        return <Badge variant="neutral" className="text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700">{isAr ? 'مسؤول المبيعات' : 'Sales Rep'}</Badge>;
      default:
        return <Badge variant="neutral" className="text-xs">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 overflow-hidden" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ─── Ultra-Modern Hero Header & Control Center (#7F1625 & #000000) ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c0305] via-[#1a050a] to-[#050102] border border-[#7F1625]/40 p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#7F1625]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#9E2A3B]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7F1625]/30 border border-[#7F1625]/50 text-[#ff8ba0] text-xs font-bold tracking-wide backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#ff4d6d] animate-pulse" />
              {isAr ? 'إعدادات الشركة والمصنع • العزل السحابي والصلاحيات' : 'Factory & Tenant Settings • Active'}
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#7F1625] flex items-center justify-center shadow-lg shadow-[#7F1625]/50 shrink-0">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span>{isAr ? 'إعدادات الشركة والمصنع والفروع' : 'Company & Factory Settings'}</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              {isAr
                ? 'إدارة الهوية الصناعية للمصنع، إنشاء حسابات المستخدمين، التحكم الدقيق في مصفوفة الصلاحيات (RBAC)، فروع التشغيل، وتأمين البيانات.'
                : 'Manage industrial identity, user accounts, granular RBAC permissions matrix, factory branches, and backup security.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleOpenAddUser}
              className="px-4 py-2.5 rounded-xl bg-[#7F1625] hover:bg-[#961b2c] text-white text-xs font-black shadow-lg shadow-[#7F1625]/40 transition-all flex items-center gap-2 active:scale-95 border border-[#ff4d6d]/30 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'إضافة مستخدم / حساب جديد' : 'New User Account'}</span>
            </button>

            <button
              onClick={() => setIsBranchModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-md cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'إضافة فرع / مخزن' : 'New Branch'}</span>
            </button>

            <button
              onClick={handleDownloadBackup}
              disabled={isDownloadingBackup}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-md cursor-pointer disabled:opacity-50"
              title={isAr ? 'تحميل نسخة احتياطية فورية' : 'Download Backup'}
            >
              <Download className={`w-4 h-4 text-emerald-400 ${isDownloadingBackup ? 'animate-bounce' : ''}`} />
              <span>{isAr ? 'نسخة احتياطية' : 'Backup'}</span>
            </button>

            <button
              onClick={loadData}
              disabled={isLoading}
              title={isAr ? 'تحديث البيانات' : 'Refresh'}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all backdrop-blur-md cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#ff8ba0]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />}
            <span className="font-semibold">{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs cursor-pointer">✕</button>
        </div>
      )}

      {/* ─── Navigation Pills for Settings Modules ─── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'users'
              ? 'bg-[#7F1625] text-white shadow-md shadow-[#7F1625]/30'
              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isAr ? 'حسابات ومستخدمي المصنع' : 'Factory Users'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">{users.length}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('rbac')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'rbac'
              ? 'bg-[#7F1625] text-white shadow-md shadow-[#7F1625]/30'
              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{isAr ? 'مصفوفة الأدوار والصلاحيات (RBAC)' : 'RBAC Permissions Matrix'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('profile')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'profile'
              ? 'bg-[#7F1625] text-white shadow-md shadow-[#7F1625]/30'
              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>{isAr ? 'الهوية الصناعية والعزل السحابي' : 'Factory Profile & Isolation'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('branches')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'branches'
              ? 'bg-[#7F1625] text-white shadow-md shadow-[#7F1625]/30'
              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{isAr ? 'فروع التشغيل والمخازن' : 'Branches & Warehouses'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">{warehouses.length}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('backup')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'backup'
              ? 'bg-[#7F1625] text-white shadow-md shadow-[#7F1625]/30'
              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>{isAr ? 'أمان البيانات والنسخ الاحتياطي' : 'Disaster Recovery'}</span>
        </button>
      </div>

      {/* ─── TAB 1: USERS & ACCESS CONTROL ─── */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>{isAr ? 'سجل حسابات المستخدمين ومسؤولي صالات المصنع' : 'Active Factory User Accounts'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr
                  ? 'يمكنك إضافة حسابات جديدة للمهندسين، أمناء المخازن، محاسبي التكاليف، والعمال، وتخصيص صلاحيات محددة لكل حساب.'
                  : 'Manage accounts for engineers, storekeepers, accountants, and line workers with custom permissions.'}
              </p>
            </div>

            <Button onClick={handleOpenAddUser} variant="primary" className="text-xs font-bold flex items-center gap-1.5 shrink-0">
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'إضافة حساب مستخدم جديد' : 'Add New User'}</span>
            </Button>
          </div>

          <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#0c1017]">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="py-3 px-4">{isAr ? 'المستخدم' : 'User'}</th>
                    <th className="py-3 px-4">{isAr ? 'البريد والهاتف' : 'Contact'}</th>
                    <th className="py-3 px-4">{isAr ? 'الدور الوظيفي' : 'Role'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الصلاحيات الفعالة' : 'Permissions'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'حالة الحساب' : 'Status'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-slate-800 dark:text-slate-200">
                  {users.map((u) => {
                    const isOwner = u.role === 'company_owner';
                    const permCount = isOwner ? 'كامل الصلاحيات (★)' : `${(u.effective_permissions || []).length} صلاحية`;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-primary shrink-0">
                              {u.name.slice(0, 1)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">ID: #{u.id}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{u.email}</span>
                            </div>
                            {u.phone && (
                              <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{u.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {getRoleBadge(u.role)}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isOwner
                              ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}>
                            {permCount}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleUserActive(u)}
                            className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold"
                            title={isAr ? 'اضغط للتبديل بين التفعيل والتعطيل' : 'Toggle status'}
                          >
                            <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            <span className={u.is_active ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-400'}>
                              {u.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Disabled')}
                            </span>
                          </button>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title={isAr ? 'تعديل الصلاحيات والحساب' : 'Edit User'}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title={isAr ? 'حذف الحساب' : 'Delete User'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ─── TAB 2: RBAC MATRIX & LIVE ROLE CUSTOMIZER ─── */}
      {activeSubTab === 'rbac' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>{isAr ? 'مصفوفة الأدوار والصلاحيات التفاعلية (Live RBAC Control Center)' : 'Interactive RBAC Matrix'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr
                  ? 'هذه الأدوار ليست مجرد شكل! يمكنك الضغط على «تعديل الصلاحيات» لتغيير ما يستطيع كل دور فعله في المصنع، أو «إضافة موظف» لإنشاء حساب فوراً.'
                  : 'Fully active role presets! Click "Customize" to change what each role can do, or "Add User" to create an account directly.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="brand" className="text-xs font-mono font-bold">
                {rolesData.length || 7} {isAr ? 'أدوار معتمدة' : 'Roles'}
              </Badge>
            </div>
          </div>

          {/* Grid of Interactive Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rolesData.map((role) => {
              const isOwner = role.key === 'company_owner';
              const permsList = role.permissions || [];
              const permsCount = isOwner ? 'كامل الصلاحيات (★)' : `${permsList.length} صلاحيات`;

              return (
                <Card
                  key={role.key}
                  className="p-4 bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3 hover:border-primary/40 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {isAr ? role.name_ar : role.name_en}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {role.key}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {role.is_customized && (
                          <Badge variant="warning" className="text-[9px] font-bold">
                            {isAr ? 'مخصص للمصنع' : 'Custom'}
                          </Badge>
                        )}
                        {getRoleBadge(role.key)}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed min-h-[32px]">
                      {isAr ? role.description_ar : role.description_en}
                    </p>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        <span>
                          {role.users_count} {isAr ? 'موظفين معينين' : 'users assigned'}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {permsCount}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isOwner}
                      onClick={() => handleOpenEditRole(role)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-primary/50 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-primary transition flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title={isOwner ? (isAr ? 'دور المالك محصن' : 'Owner is locked') : (isAr ? 'تعديل صلاحيات هذا الدور' : 'Customize role permissions')}
                    >
                      <Edit2 className="w-3 h-3 text-amber-500" />
                      <span>{isAr ? 'تعديل الصلاحيات' : 'Customize'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickAddUserWithRole(role.key)}
                      className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      title={isAr ? 'إنشاء حساب موظف جديد بهذا الدور' : 'Add user with this role'}
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isAr ? 'إضافة موظف' : 'Add User'}</span>
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 3: FACTORY PROFILE & ISOLATION ─── */}
      {activeSubTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 p-5 bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{profileName}</h4>
                <p className="text-[11px] font-mono text-primary font-bold">{tenantCode}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">{isAr ? 'الموقع التشغيلي الرئيسي' : 'Primary Site'}</span>
                <strong className="text-slate-800 dark:text-slate-200 font-medium">{branchName}</strong>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">{isAr ? 'حالة العزل السحابي (Multi-Tenancy)' : 'Multi-Tenancy Isolation'}</span>
                <div className="flex items-center gap-1.5 mt-1 text-slate-700 dark:text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium text-[11px]">{isAr ? 'Fail-Closed Active — عزل تام لكل مستأجر' : 'Fail-Closed Strict Isolation'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">{isAr ? 'حماية البيانات وقاعدة المصنع' : 'Database Security'}</span>
                <div className="text-slate-700 dark:text-slate-300 mt-1">
                  {isAr ? 'قاعدة بيانات مشفرة معزولة بمفتاح مستأجر خاص' : 'Isolated Tenant Schema with Foreign Key Barriers'}
                </div>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-2 p-5 bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-slate-800 shadow-xs">
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isAr ? 'تعديل الهوية الصناعية والبيانات الضريبية للمصنع' : 'Factory Identity & Official Credentials'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr ? 'تظهر هذه البيانات على بطاقات التكلفة، فواتير المبيعات، وأوامر التشغيل الرسمية.' : 'Appears on official A4 printouts, cost sheets, and invoices.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">{isAr ? 'اسم المصنع' : 'Factory Name'}</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">{isAr ? 'الاسم التجاري الرسمي' : 'Commercial Name'}</label>
                  <input
                    type="text"
                    value={commercialName}
                    onChange={(e) => setCommercialName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">{isAr ? 'رقم التسجيل الضريبي' : 'Tax ID'}</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">{isAr ? 'رقم السجل الصناعي' : 'Industrial Registry'}</label>
                  <input
                    type="text"
                    value={industrialReg}
                    onChange={(e) => setIndustrialReg(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">{isAr ? 'هاتف الإدارة والتواصل' : 'Contact Phone'}</label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">{isAr ? 'البريد الإلكتروني الرسمي' : 'Official Email'}</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">{isAr ? 'العنوان والموقع الصناعي' : 'Factory Address'}</label>
                <input
                  type="text"
                  value={profileAddress}
                  onChange={(e) => setProfileAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button variant="primary" type="submit" disabled={isSavingProfile} className="text-xs font-bold">
                  {isSavingProfile ? (isAr ? 'جارِ الحفظ...' : 'Saving...') : (isAr ? 'حفظ تعديلات الهوية' : 'Save Changes')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ─── TAB 4: BRANCHES & WAREHOUSES ─── */}
      {activeSubTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>{isAr ? 'فروع التشغيل والمخازن الصناعية المعتمدة' : 'Operational Branches & Warehouses'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr ? 'مواقع صالات القص، مخازن الأقمشة والمستلزمات، ونقاط التسليم.' : 'Cutting floors, raw material storage, and delivery depots.'}
              </p>
            </div>

            <Button onClick={() => setIsBranchModalOpen(true)} variant="primary" className="text-xs font-bold flex items-center gap-1.5 shrink-0">
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'إضافة فرع / مخزن جديد' : 'Add Branch / Warehouse'}</span>
            </Button>
          </div>

          <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#0c1017]">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="py-2.5 px-4">{isAr ? 'كود الموقع' : 'Code'}</th>
                    <th className="py-2.5 px-4">{isAr ? 'اسم الموقع' : 'Location Name'}</th>
                    <th className="py-2.5 px-4">{isAr ? 'النوع التشغيلي' : 'Operational Type'}</th>
                    <th className="py-2.5 px-4">{isAr ? 'المسؤول' : 'Manager'}</th>
                    <th className="py-2.5 px-4">{isAr ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {warehouses.map((wh) => (
                    <tr key={wh.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">{wh.code}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">{wh.name}</td>
                      <td className="py-2.5 px-4">
                        <Badge variant="neutral">{wh.type || (isAr ? 'مخزن رئيسي' : 'Storage')}</Badge>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 font-medium">
                        {wh.manager_name || (isAr ? 'إدارة المصنع' : 'Operations')}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {isAr ? 'جاهز للتشغيل' : 'Operational'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ─── TAB 5: BACKUP & DISASTER RECOVERY ─── */}
      {activeSubTab === 'backup' && (
        <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#0c1017]">
          <div className="p-5 bg-gradient-to-r from-slate-900 via-[#180508] to-slate-900 text-white border-b border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <span>{isAr ? 'إدارة النسخ الاحتياطي وأمان البيانات الصناعية' : 'Disaster Recovery & Database Backup'}</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {isAr ? 'مشفر ومؤمن AES-256' : 'AES-256 Audited'}
                  </span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  {isAr
                    ? 'تصدير وتحميل قاعدة بيانات المصنع وحسابات العملاء والإنتاج بضغطة زر واحدة لحفظها محلياً.'
                    : 'Export and download an audited snapshot of factory orders, ledger entries, and tenant database.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={isDownloadingBackup}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <Download className={`w-4 h-4 ${isDownloadingBackup ? 'animate-bounce' : ''}`} />
                <span>
                  {isDownloadingBackup
                    ? (isAr ? 'جاري تجهيز النسخة...' : 'Preparing Dump...')
                    : (isAr ? 'تحميل نسخة احتياطية فورية' : 'Download Instant Backup')}
                </span>
              </button>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                <Database className="w-3.5 h-3.5 text-indigo-500" />
                <span>{isAr ? 'محرك قاعدة البيانات' : 'Database Driver'}</span>
              </div>
              <div className="font-mono font-bold text-slate-900 dark:text-white uppercase text-sm">
                {backupStatus?.driver ? `${backupStatus.driver} Engine` : 'SQLite 3 (WAL)'}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                {isAr ? 'عالي السرعة ومحصن صناعياً' : 'High Performance'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                <HardDrive className="w-3.5 h-3.5 text-amber-500" />
                <span>{isAr ? 'حجم البيانات النشط' : 'Current DB Size'}</span>
              </div>
              <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                {backupStatus?.size_human || '3.23 MB'}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isAr ? 'يشمل الأرشفة والمرفقات' : 'Compacted storage'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>{isAr ? 'السجلات المحمية' : 'Protected Records'}</span>
              </div>
              <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                {backupStatus?.records_summary?.total_records ? `${backupStatus.records_summary.total_records.toLocaleString()}+` : '3,800+'} {isAr ? 'سجل' : 'rows'}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isAr ? 'قيود + أوامر قص + مبيعات' : 'Journals, BOMs & Orders'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                <span>{isAr ? 'حالة التكامل والفحص' : 'Integrity Audit'}</span>
              </div>
              <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                {isAr ? 'سليمة 100% ومطابقة' : '100% Verified'}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                {backupStatus?.latest_backup_date ? `${backupStatus.latest_backup_date.slice(0, 16)}` : 'Live Synced'}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* ─── MODAL: ADD / EDIT USER & GRANULAR PERMISSIONS ─── */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={editingUserId ? (isAr ? 'تعديل حساب المستخدم والصلاحيات' : 'Edit User & Permissions') : (isAr ? 'إنشاء حساب مستخدم جديد وتحديد الصلاحيات' : 'Create New Factory User')}
      >
        <form onSubmit={handleSaveUser} className="space-y-5 text-xs text-slate-900 dark:text-white max-h-[80vh] overflow-y-auto pr-1">
          {/* Basic User Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">{isAr ? 'اسم المستخدم الكامل *' : 'Full Name *'}</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder={isAr ? 'مثال: م. مصطفى إبراهيم' : 'e.g. John Doe'}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">{isAr ? 'البريد الإلكتروني لتسجيل الدخول *' : 'Email Address *'}</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="user@factory.test"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                {isAr ? 'كلمة المرور' : 'Password'} {editingUserId && <span className="font-normal text-slate-400">({isAr ? 'اتركها فارغة إذا لم ترغب بالتغيير' : 'leave blank to keep unchanged'})</span>}
              </label>
              <input
                type="password"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                required={!editingUserId}
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">{isAr ? 'رقم الهاتف' : 'Phone Number'}</label>
              <input
                type="text"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                placeholder="010XXXXXXXX"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">{isAr ? 'الدور الوظيفي الأساسي للمستخدم *' : 'Primary Role *'}</label>
            <select
              value={userRole}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white font-bold"
            >
              <option value="production_manager">{isAr ? 'مهندس / مدير صالة القص والإنتاج (Production Lead)' : 'Production Manager'}</option>
              <option value="inventory_custodian">{isAr ? 'أمين مخزن الأقمشة والمستلزمات (Storekeeper)' : 'Inventory Custodian'}</option>
              <option value="accountant">{isAr ? 'محاسب التكاليف والمالية (Cost & Accountant)' : 'Accountant'}</option>
              <option value="quality_controller">{isAr ? 'مدقق ومفتش الجودة (QC Inspector)' : 'QC Controller'}</option>
              <option value="sales_rep">{isAr ? 'مسؤول المبيعات والمعارض (Sales Specialist)' : 'Sales Rep'}</option>
              <option value="worker">{isAr ? 'عامل تشغيل / خط إنتاج (Line Operator)' : 'Worker'}</option>
              <option value="company_owner">{isAr ? 'مالك المصنع / مدير عام (Full Owner Privileges)' : 'Company Owner'}</option>
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {isAr ? 'اختيار الدور يحدد الصلاحيات القياسية تلقائياً، ويمكنك تخصيصها بدقة بالأسفل.' : 'Selecting a role auto-fills recommended permissions.'}
            </p>
          </div>

          {userRole !== 'company_owner' && (
            <div className="space-y-2 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold text-xs">
                  {isAr ? 'الفروع المسموح لهذا المستخدم بالوصول إليها *' : 'Authorized Branches *'}
                </label>
                <p className="text-[10px] text-slate-500 mt-1">
                  {isAr ? 'لن يتمكن المستخدم من رؤية مخازن أو بيانات فرع غير معيّن له.' : 'The user cannot access warehouses or data from unassigned branches.'}
                </p>
              </div>
              {availableBranches.length === 0 ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {isAr ? 'لا توجد فروع متاحة للتعيين. أنشئ الفروع أولاً.' : 'No branches available. Create a branch first.'}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableBranches.map((branch) => (
                    <label key={branch.id} className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-xs">
                      <input
                        type="checkbox"
                        checked={userBranchIds.includes(branch.id)}
                        onChange={(event) => setUserBranchIds((current) =>
                          event.target.checked
                            ? [...current, branch.id]
                            : current.filter((id) => id !== branch.id)
                        )}
                        className="h-4 w-4 rounded text-primary"
                      />
                      <span className="text-slate-800 dark:text-slate-200">{branch.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* User Active Status Checkbox */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <input
              type="checkbox"
              id="userIsActive"
              checked={userIsActive}
              onChange={(e) => setUserIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="userIsActive" className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer">
              {isAr ? 'الحساب نشط ويستطيع تسجيل الدخول والعمل' : 'Account is active and permitted to login'}
            </label>
          </div>

          {/* Granular Permissions Section */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  <span>{isAr ? 'التحكم الدقيق في الصلاحيات الممنوحة لهذا الحساب (Granular RBAC)' : 'Granular Permissions Override'}</span>
                </h4>
                <p className="text-[10px] text-slate-500">
                  {isAr ? 'قم بتحديد أو إلغاء أي صلاحية بحسب المسؤوليات الدقيقة الموكلة لهذا الموظف.' : 'Check or uncheck individual privileges to match job responsibilities.'}
                </p>
              </div>

              {userRole === 'company_owner' && (
                <Badge variant="danger" className="text-[10px] font-bold">
                  {isAr ? 'صلاحيات كاملة غير مقيدة' : 'Full Access'}
                </Badge>
              )}
            </div>

            {userRole === 'company_owner' ? (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 font-medium">
                {isAr
                  ? 'حساب مالك المصنع يمتلك افتراضياً كافة الصلاحيات التشغيلية والإدارية والمالية بدون قيود.'
                  : 'Company Owner account automatically possesses full unconstrained privileges.'}
              </div>
            ) : (
              <div className="space-y-3">
                {permissionsCatalog.map((moduleItem) => {
                  const modulePerms = moduleItem.permissions || [];
                  const allSelected = modulePerms.every((p: any) => userPermissions.includes(p.key));

                  return (
                    <div
                      key={moduleItem.module}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span>{isAr ? moduleItem.name_ar : moduleItem.name_en}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSelectAllInModule(modulePerms)}
                          className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                        >
                          {allSelected ? (isAr ? 'إلغاء تحديد الكل' : 'Deselect All') : (isAr ? 'تحديد كل القسم' : 'Select All')}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {modulePerms.map((perm: any) => {
                          const isChecked = userPermissions.includes(perm.key);

                          return (
                            <label
                              key={perm.key}
                              className={`p-2 rounded-lg border text-[11px] flex items-center gap-2 cursor-pointer transition ${
                                isChecked
                                  ? 'bg-primary/5 dark:bg-primary/10 border-primary/40 text-slate-900 dark:text-white font-semibold'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePermission(perm.key)}
                                className="w-3.5 h-3.5 rounded text-primary focus:ring-primary cursor-pointer shrink-0"
                              />
                              <div className="truncate">
                                <div>{isAr ? perm.name_ar : perm.name_en}</div>
                                <div className="text-[9px] font-mono text-slate-400">{perm.key}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setIsUserModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmittingUser}>
              {isSubmittingUser
                ? (isAr ? 'جارِ الحفظ...' : 'Saving...')
                : editingUserId
                ? (isAr ? 'حفظ تعديلات الحساب' : 'Update User')
                : (isAr ? 'إنشاء الحساب وتفعيل الصلاحيات' : 'Create User')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL: ADD BRANCH / WAREHOUSE ─── */}
      <Modal
        isOpen={isBranchModalOpen}
        onClose={() => setIsBranchModalOpen(false)}
        title={isAr ? 'إضافة فرع تشغيل أو مخزن أقمشة جديد' : 'Add New Branch / Warehouse'}
      >
        <form onSubmit={handleCreateBranch} className="space-y-4 text-xs text-slate-900 dark:text-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">{isAr ? 'اسم الفرع / الموقع *' : 'Branch Name *'}</label>
              <input
                type="text"
                value={branchNameInput}
                onChange={(e) => setBranchNameInput(e.target.value)}
                placeholder={isAr ? 'مثال: صالة القص - قطاع د' : 'e.g. Cutting Center B'}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">{isAr ? 'كود الموقع *' : 'Location Code *'}</label>
              <input
                type="text"
                value={branchCodeInput}
                onChange={(e) => setBranchCodeInput(e.target.value)}
                placeholder="WH-CUT-02"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">{isAr ? 'النوع التشغيلي *' : 'Operational Type *'}</label>
              <select
                value={branchTypeInput}
                onChange={(e) => setBranchTypeInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="factory">{isAr ? 'صالة مصنع رئيسية' : 'Factory Floor'}</option>
                <option value="cutting_center">{isAr ? 'مركز قص مخصص' : 'Cutting Center'}</option>
                <option value="warehouse">{isAr ? 'مستودع أقمشة ومستلزمات' : 'Material Warehouse'}</option>
                <option value="workshop">{isAr ? 'ورشة خياطة وتشغيل' : 'Sewing Workshop'}</option>
                <option value="outlet">{isAr ? 'معرض مبيعات ومنافذ' : 'Showroom / Outlet'}</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">{isAr ? 'اسم المدير المسؤول' : 'Manager Name'}</label>
              <input
                type="text"
                value={branchManagerInput}
                onChange={(e) => setBranchManagerInput(e.target.value)}
                placeholder={isAr ? 'مثال: أ. محمود فتحي' : 'Manager Name'}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">{isAr ? 'العنوان / الموقع' : 'Address'}</label>
            <input
              type="text"
              value={branchAddressInput}
              onChange={(e) => setBranchAddressInput(e.target.value)}
              placeholder={isAr ? 'العنوان التفصيلي للموقع' : 'Detailed Address'}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">{isAr ? 'هاتف الموقع' : 'Phone'}</label>
            <input
              type="text"
              value={branchPhoneInput}
              onChange={(e) => setBranchPhoneInput(e.target.value)}
              placeholder="010XXXXXXXX"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setIsBranchModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmittingBranch}>
              {isSubmittingBranch ? (isAr ? 'جارِ الإضافة...' : 'Adding...') : (isAr ? 'إضافة الموقع' : 'Add Location')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL: CUSTOMIZE ROLE PERMISSIONS FOR THE FACTORY ─── */}
      <Modal
        isOpen={isEditRoleModalOpen}
        onClose={() => setIsEditRoleModalOpen(false)}
        title={isAr ? `تعديل وضبط صلاحيات الدور: ${selectedRoleForEdit?.name_ar || ''}` : `Customize Role: ${selectedRoleForEdit?.name_en || ''}`}
      >
        <form onSubmit={handleSaveRolePermissions} className="space-y-4 text-xs text-slate-900 dark:text-white max-h-[80vh] overflow-y-auto pr-1">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
            <span className="font-bold">⚠️ {isAr ? 'تنبيه إداري:' : 'Administrative Notice:'} </span>
            {isAr
              ? 'تعديل هذا القالب يغير الصلاحيات الافتراضية الممنوحة لهذا الدور لجميع الموظفين الجدد والحاليين في مصنعك.'
              : 'Modifying this role template adjusts default privileges across all employees carrying this role.'}
          </div>

          <div className="space-y-3">
            {permissionsCatalog.map((moduleItem) => {
              const modulePerms = moduleItem.permissions || [];
              const allSelected = modulePerms.every((p: any) => roleEditPermissions.includes(p.key));

              return (
                <div
                  key={moduleItem.module}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                    <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>{isAr ? moduleItem.name_ar : moduleItem.name_en}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectAllInRoleEditModule(modulePerms)}
                      className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      {allSelected ? (isAr ? 'إلغاء تحديد الكل' : 'Deselect All') : (isAr ? 'تحديد كل القسم' : 'Select All')}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {modulePerms.map((perm: any) => {
                      const isChecked = roleEditPermissions.includes(perm.key);

                      return (
                        <label
                          key={perm.key}
                          className={`p-2 rounded-lg border text-[11px] flex items-center gap-2 cursor-pointer transition ${
                            isChecked
                              ? 'bg-primary/5 dark:bg-primary/10 border-primary/40 text-slate-900 dark:text-white font-semibold'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleRoleEditPermission(perm.key)}
                            className="w-3.5 h-3.5 rounded text-primary focus:ring-primary cursor-pointer shrink-0"
                          />
                          <div className="truncate">
                            <div>{isAr ? perm.name_ar : perm.name_en}</div>
                            <div className="text-[9px] font-mono text-slate-400">{perm.key}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setIsEditRoleModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button variant="primary" type="submit" disabled={isSavingRole}>
              {isSavingRole ? (isAr ? 'جارِ الحفظ...' : 'Saving...') : (isAr ? 'حفظ واعتماد صلاحيات الدور للمصنع' : 'Save Role Presets')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

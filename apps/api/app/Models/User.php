<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'tenant_id',
        'name',
        'email',
        'phone',
        'role',
        'permissions',
        'permissions_mode',
        'is_active',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'permissions' => 'array',
        ];
    }

    /**
     * كتالوج الصلاحيات التفصيلية لمنظومة المصنع
     */
    public static function getPermissionsCatalog(): array
    {
        return [
            [
                'module' => 'cutting',
                'name_ar' => 'صالة القص وفرش الأقمشة',
                'name_en' => 'Cutting Floor',
                'permissions' => [
                    ['key' => 'cutting.view', 'name_ar' => 'عرض أوامر وفرشات القص', 'name_en' => 'View Cutting Orders'],
                    ['key' => 'cutting.create', 'name_ar' => 'إنشاء أوامر وفرش جديد', 'name_en' => 'Create Cutting Lays'],
                    ['key' => 'cutting.issue', 'name_ar' => 'إذن صرف أقمشة ومستلزمات للقص', 'name_en' => 'Issue Fabric to Cutting'],
                    ['key' => 'production.manage', 'name_ar' => 'إدارة خطوط الإنتاج والتشغيل', 'name_en' => 'Manage Production Runs'],
                    ['key' => 'production.work', 'name_ar' => 'تسجيل تنفيذ التشغيل والإنتاج', 'name_en' => 'Record Production Work'],
                ],
            ],
            [
                'module' => 'inventory',
                'name_ar' => 'المخازن وإدارة الأقمشة والأمانات',
                'name_en' => 'Inventory & Storage',
                'permissions' => [
                    ['key' => 'inventory.view', 'name_ar' => 'معاينة أرصدة الأقمشة والمخازن', 'name_en' => 'View Stock Balances'],
                    ['key' => 'inventory.manage', 'name_ar' => 'إدارة كروت الأصناف ووحدات القياس', 'name_en' => 'Manage Inventory Items & Units'],
                    ['key' => 'inventory.receive', 'name_ar' => 'استلام خامات وتوريدات (GRN)', 'name_en' => 'Receive Raw Materials'],
                    ['key' => 'inventory.dispatch', 'name_ar' => 'صرف وتحويل بين المخازن', 'name_en' => 'Dispatch & Transfer Stock'],
                ],
            ],
            [
                'module' => 'procurement_costing',
                'name_ar' => 'المشتريات وتكاليف الإنتاج (BOM)',
                'name_en' => 'Procurement & Costing',
                'permissions' => [
                    ['key' => 'procurement.view', 'name_ar' => 'عرض أوامر وفواتير الشراء', 'name_en' => 'View Purchase Orders'],
                    ['key' => 'procurement.create', 'name_ar' => 'إصدار أوامر شراء ومطابقة موردين', 'name_en' => 'Create Purchase Orders'],
                    ['key' => 'costing.view', 'name_ar' => 'معاينة بطاقات التكلفة للقطعة (Cost Sheets)', 'name_en' => 'View Cost Sheets'],
                    ['key' => 'costing.manage', 'name_ar' => 'تعديل معايير التكلفة وقوائم BOM', 'name_en' => 'Manage BOM & Cost Standards'],
                ],
            ],
            [
                'module' => 'quality',
                'name_ar' => 'تدقيق الجودة والفحص (QC)',
                'name_en' => 'Quality Control',
                'permissions' => [
                    ['key' => 'qc.inspect', 'name_ar' => 'فحص حزم الإنتاج وعينات الأقمشة', 'name_en' => 'Perform QC Inspections'],
                    ['key' => 'qc.approve', 'name_ar' => 'إجازة واعتماد الجودة والتعبئة', 'name_en' => 'Approve Quality Inspection'],
                    ['key' => 'qc.reject', 'name_ar' => 'رفض المعيب وتحديد الهدر والتعويض', 'name_en' => 'Reject Defective Items'],
                ],
            ],
            [
                'module' => 'sales',
                'name_ar' => 'المبيعات والمعارض والعملاء',
                'name_en' => 'Sales & Showroom',
                'permissions' => [
                    ['key' => 'sales.view', 'name_ar' => 'عرض فواتير ومردودات البيع', 'name_en' => 'View Sales Invoices'],
                    ['key' => 'sales.create', 'name_ar' => 'إصدار أوامر وفواتير البيع للعملاء', 'name_en' => 'Issue Sales Invoices'],
                    ['key' => 'sales.discount', 'name_ar' => 'منح خصومات تجارية للعملاء', 'name_en' => 'Grant Customer Discounts'],
                ],
            ],
            [
                'module' => 'accounting',
                'name_ar' => 'الحسابات ودفتر الأستاذ والتقارير',
                'name_en' => 'Accounting & Reports',
                'permissions' => [
                    ['key' => 'accounting.view', 'name_ar' => 'معاينة ميزان المراجعة والأرباح والخسائر', 'name_en' => 'View Trial Balance & P&L'],
                    ['key' => 'accounting.post', 'name_ar' => 'تسجيل وإقفال السندات والقيود اليومية', 'name_en' => 'Post Journal Entries'],
                    ['key' => 'reports.export', 'name_ar' => 'تصدير التقارير المالية والضريبية', 'name_en' => 'Export Financial Reports'],
                ],
            ],
            [
                'module' => 'branches',
                'name_ar' => 'الوصول إلى الفروع',
                'name_en' => 'Branch Access',
                'permissions' => [
                    ['key' => 'branches.view', 'name_ar' => 'عرض الفروع المعيّنة للمستخدم', 'name_en' => 'View Assigned Branches'],
                ],
            ],
            [
                'module' => 'administration',
                'name_ar' => 'إدارة النظام والأمان والنسخ الاحتياطي',
                'name_en' => 'Admin & Security',
                'permissions' => [
                    ['key' => 'admin.users', 'name_ar' => 'إدارة حسابات المستخدمين ومصفوفة الصلاحيات', 'name_en' => 'Manage Users & Permissions'],
                    ['key' => 'admin.settings', 'name_ar' => 'تعديل بيانات المصنع والفروع والمخازن', 'name_en' => 'Edit Factory Settings & Branches'],
                    ['key' => 'admin.backup', 'name_ar' => 'تصدير وتحميل النسخ الاحتياطية للمصنع', 'name_en' => 'Export & Download Backups'],
                ],
            ],
            [
                'module' => 'hr',
                'name_ar' => 'الموارد البشرية والرواتب',
                'name_en' => 'HR & Payroll',
                'permissions' => [
                    ['key' => 'hr.view', 'name_ar' => 'عرض الموظفين والحضور', 'name_en' => 'View Employees & Attendance'],
                    ['key' => 'hr.manage', 'name_ar' => 'إدارة الموظفين والحضور والإجازات', 'name_en' => 'Manage Employees & Attendance'],
                    ['key' => 'hr.payroll', 'name_ar' => 'إعداد واعتماد الرواتب', 'name_en' => 'Manage Payroll'],
                ],
            ],
            [
                'module' => 'storefront',
                'name_ar' => 'المتجر الإلكتروني',
                'name_en' => 'Storefront',
                'permissions' => [
                    ['key' => 'storefront.view', 'name_ar' => 'عرض إعدادات المتجر والطلبات', 'name_en' => 'View Storefront'],
                    ['key' => 'storefront.manage', 'name_ar' => 'إدارة تصميم وإعدادات المتجر', 'name_en' => 'Manage Storefront'],
                ],
            ],
            [
                'module' => 'maintenance',
                'name_ar' => 'الصيانة والمعدات',
                'name_en' => 'Maintenance',
                'permissions' => [
                    ['key' => 'maintenance.view', 'name_ar' => 'عرض المعدات وأوامر الصيانة', 'name_en' => 'View Maintenance'],
                    ['key' => 'maintenance.manage', 'name_ar' => 'إدارة المعدات وأوامر الصيانة', 'name_en' => 'Manage Maintenance'],
                ],
            ],
            [
                'module' => 'waslat_worsh',
                'name_ar' => 'وصلة ورش',
                'name_en' => 'Waslat Worsh Marketplace',
                'permissions' => [
                    ['key' => 'waslat_worsh.view', 'name_ar' => 'عرض طلبات وعروض وصلة ورش', 'name_en' => 'View Marketplace Requests'],
                    ['key' => 'waslat_worsh.manage', 'name_ar' => 'إنشاء وإدارة طلبات وعروض وصلة ورش', 'name_en' => 'Manage Marketplace Requests'],
                    ['key' => 'waslat_worsh.payments', 'name_ar' => 'إدارة مدفوعات وعمولات وصلة ورش', 'name_en' => 'Manage Marketplace Payments'],
                ],
            ],
            [
                'module' => 'subcontracting',
                'name_ar' => 'التشغيل للغير والمقاولات',
                'name_en' => 'Subcontracting',
                'permissions' => [
                    ['key' => 'subcontracting.view', 'name_ar' => 'عرض أوامر التشغيل للغير', 'name_en' => 'View Subcontracting'],
                    ['key' => 'subcontracting.manage', 'name_ar' => 'إدارة أوامر التشغيل للغير', 'name_en' => 'Manage Subcontracting'],
                    ['key' => 'subcontracting.payments', 'name_ar' => 'سداد واعتماد فواتير التشغيل للغير', 'name_en' => 'Pay Subcontracting Invoices'],
                ],
            ],
        ];
    }

    /**
     * الصلاحيات الافتراضية لكل دور مع دعم التخصيص على مستوى المصنع
     */
    public static function getDefaultPermissionsForRole(string $role, ?string $tenantId = null): array
    {
        $tenantId = $tenantId ?? (app()->bound('current_tenant_id') ? app('current_tenant_id') : null);
        if ($tenantId) {
            $tenant = Tenant::find($tenantId);
            $customRoles = $tenant?->settings['custom_role_permissions'] ?? [];
            if (array_key_exists($role, $customRoles) && is_array($customRoles[$role])) {
                return array_values(array_unique($customRoles[$role]));
            }
        }

        switch ($role) {
            case 'company_owner':
                return ['*'];
            case 'production_manager':
            case 'production_engineer':
                return ['cutting.view', 'cutting.create', 'cutting.issue', 'production.manage', 'inventory.view', 'inventory.manage', 'inventory.dispatch', 'qc.inspect', 'costing.view', 'sales.view', 'sales.create', 'branches.view', 'maintenance.view', 'maintenance.manage', 'subcontracting.view', 'subcontracting.manage', 'production.work'];
            case 'inventory_custodian':
            case 'warehouse':
            case 'storekeeper':
            case 'warehouse_manager':
                return ['inventory.view', 'inventory.manage', 'inventory.receive', 'inventory.dispatch', 'cutting.view', 'branches.view', 'procurement.view', 'procurement.create'];
            case 'accountant':
            case 'financial_accountant':
                return ['accounting.view', 'accounting.post', 'reports.export', 'costing.view', 'costing.manage', 'procurement.view', 'procurement.create', 'sales.view', 'branches.view', 'inventory.view', 'inventory.manage', 'hr.view', 'hr.payroll', 'subcontracting.view', 'subcontracting.payments'];
            case 'quality_controller':
            case 'qc':
                return ['qc.inspect', 'qc.approve', 'qc.reject', 'cutting.view', 'branches.view', 'inventory.view'];
            case 'sales_rep':
                return ['sales.view', 'sales.create', 'sales.discount', 'branches.view', 'inventory.view', 'storefront.view'];
            case 'worker':
            case 'operator':
                return ['cutting.view', 'production.manage'];
            default:
                return [];
        }
    }

    /**
     * إرجاع كافة الصلاحيات الفعالة للمستخدم
     */
    public function getEffectivePermissions(): array
    {
        if ($this->role === 'company_owner') {
            return ['*'];
        }

        if ($this->permissions_mode === 'custom') {
            return array_values(array_unique(is_array($this->permissions) ? $this->permissions : []));
        }

        return self::getDefaultPermissionsForRole($this->role, $this->tenant_id);
    }

    /**
     * قائمة المفاتيح المعتمدة فقط؛ يمنع تخزين صلاحيات مجهولة أو نجمة عامة للأدوار غير المالكة.
     */
    public static function getAllPermissionKeys(): array
    {
        $keys = [];
        foreach (self::getPermissionsCatalog() as $module) {
            foreach ($module['permissions'] ?? [] as $permission) {
                if (isset($permission['key'])) {
                    $keys[] = $permission['key'];
                }
            }
        }

        return array_values(array_unique($keys));
    }

    public function hasExplicitPermissionConfiguration(): bool
    {
        if ($this->permissions_mode === 'custom') {
            return true;
        }

        $customRoles = $this->tenant?->settings['custom_role_permissions'] ?? [];

        return is_array($customRoles)
            && array_key_exists($this->role, $customRoles)
            && is_array($customRoles[$this->role]);
    }

    /**
     * فحص امتلاك صلاحية محددة
     */
    public function hasPermission(string $permission): bool
    {
        if ($this->role === 'company_owner') {
            return true;
        }

        if ($this->role === 'platform_admin') {
            return false;
        }

        $effective = $this->getEffectivePermissions();
        return in_array('*', $effective, true) || in_array($permission, $effective, true);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function branches(): BelongsToMany
    {
        return $this->belongsToMany(Branch::class, 'branch_user', 'user_id', 'branch_id')
            ->withTimestamps();
    }

    public function assignedBranchIds(): array
    {
        return $this->branches()->pluck('branches.id')->all();
    }

    protected static function boot(): void
    {
        parent::boot();

        static::saving(function (User $user) {
            if ($user->isDirty('role') && $user->role === 'platform_admin') {
                $authUser = auth()->user();
                if ($authUser) {
                    $originalRole = $authUser->getOriginal('role') ?? $authUser->role;
                    if ($originalRole !== 'platform_admin') {
                        throw new \Illuminate\Auth\Access\AuthorizationException('أمان: محاولة غير مصرح بها لترقية الحساب إلى مشرف منصة عام (PlatformAdminEscalationBlocked).');
                    }
                } elseif (!app()->runningInConsole()) {
                    throw new \Illuminate\Auth\Access\AuthorizationException('أمان: لا يمكن إنشاء مشرف منصة عام دون مصادقة إدارية معتمدة.');
                }
            }
        });
    }
}

<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
                ],
            ],
            [
                'module' => 'inventory',
                'name_ar' => 'المخازن وإدارة الأقمشة والأمانات',
                'name_en' => 'Inventory & Storage',
                'permissions' => [
                    ['key' => 'inventory.view', 'name_ar' => 'معاينة أرصدة الأقمشة والمخازن', 'name_en' => 'View Stock Balances'],
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
                'module' => 'administration',
                'name_ar' => 'إدارة النظام والأمان والنسخ الاحتياطي',
                'name_en' => 'Admin & Security',
                'permissions' => [
                    ['key' => 'admin.users', 'name_ar' => 'إدارة حسابات المستخدمين ومصفوفة الصلاحيات', 'name_en' => 'Manage Users & Permissions'],
                    ['key' => 'admin.settings', 'name_ar' => 'تعديل بيانات المصنع والفروع والمخازن', 'name_en' => 'Edit Factory Settings & Branches'],
                    ['key' => 'admin.backup', 'name_ar' => 'تصدير وتحميل النسخ الاحتياطية للمصنع', 'name_en' => 'Export & Download Backups'],
                ],
            ],
        ];
    }

    /**
     * الصلاحيات الافتراضية لكل دور
     */
    public static function getDefaultPermissionsForRole(string $role): array
    {
        switch ($role) {
            case 'company_owner':
                return ['*'];
            case 'production_manager':
            case 'production_engineer':
                return ['cutting.view', 'cutting.create', 'cutting.issue', 'production.manage', 'inventory.view', 'qc.inspect', 'costing.view'];
            case 'inventory_custodian':
            case 'warehouse':
            case 'storekeeper':
            case 'warehouse_manager':
                return ['inventory.view', 'inventory.receive', 'inventory.dispatch', 'cutting.view', 'procurement.view'];
            case 'accountant':
            case 'financial_accountant':
                return ['accounting.view', 'accounting.post', 'reports.export', 'costing.view', 'costing.manage', 'procurement.view', 'sales.view'];
            case 'quality_controller':
            case 'qc':
                return ['qc.inspect', 'qc.approve', 'qc.reject', 'cutting.view', 'inventory.view'];
            case 'sales_rep':
                return ['sales.view', 'sales.create', 'sales.discount', 'inventory.view'];
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

        $defaults = self::getDefaultPermissionsForRole($this->role);
        $custom = is_array($this->permissions) ? $this->permissions : [];

        return array_values(array_unique(array_merge($defaults, $custom)));
    }

    /**
     * فحص امتلاك صلاحية محددة
     */
    public function hasPermission(string $permission): bool
    {
        if ($this->role === 'company_owner' || $this->role === 'platform_admin') {
            return true;
        }

        $effective = $this->getEffectivePermissions();
        return in_array('*', $effective, true) || in_array($permission, $effective, true);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
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

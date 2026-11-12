<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    /**
     * التحقق الصارم من أدوار وصلاحيات المستخدم داخل الشركة المستأجرة (Role-Based Access Control)
     * يدعم تمرير دور واحد أو قائمة أدوار مسموح بها مفصولة بفواصل
     *
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'error' => 'Unauthenticated',
                'message' => 'يجب تسجيل الدخول أولاً للوصول إلى هذا المورد.',
            ], 401);
        }

        $userRole = $user->role;

        // دعم الأدوار الممررة سواء مفصولة بفواصل أو معاملات متعددة
        $allowedRoles = [];
        foreach ($roles as $roleGroup) {
            foreach (explode(',', $roleGroup) as $r) {
                $trimmed = trim($r);
                if ($trimmed !== '') {
                    $allowedRoles[] = $trimmed;
                }
            }
        }

        // خريطة ترادف الأدوار المعتمدة بالمنظومة (Role Aliases & Normalized Sets)
        $roleAliases = [
            'accountant' => ['accountant', 'financial_accountant'],
            'financial_accountant' => ['accountant', 'financial_accountant'],
            'production_manager' => ['production_manager', 'production_engineer'],
            'production_engineer' => ['production_manager', 'production_engineer'],
            'quality_controller' => ['quality_controller', 'qc'],
            'qc' => ['quality_controller', 'qc'],
            'inventory_custodian' => ['inventory_custodian', 'warehouse', 'storekeeper', 'warehouse_manager'],
            'warehouse' => ['inventory_custodian', 'warehouse', 'storekeeper', 'warehouse_manager'],
            'storekeeper' => ['inventory_custodian', 'warehouse', 'storekeeper', 'warehouse_manager'],
            'warehouse_manager' => ['inventory_custodian', 'warehouse', 'storekeeper', 'warehouse_manager'],
            'worker' => ['worker', 'operator'],
            'operator' => ['worker', 'operator'],
        ];

        // مشرف المنصة محظور من العمليات التشغيلية داخل المصانع، ويُستثنى فقط
        // من مسارات إدارة الاشتراكات المركزية المصرّح بها صراحةً.
        $routeUri = $request->route()?->uri() ?? $request->path();
        $isPlatformSubscriptionAdminRoute = str_starts_with(ltrim($routeUri, '/'), 'api/v1/admin/subscriptions')
            || str_starts_with(ltrim($routeUri, '/'), 'admin/subscriptions');
        if ($userRole === 'platform_admin' && !$isPlatformSubscriptionAdminRoute) {
            return response()->json([
                'error' => 'UnauthorizedRole',
                'message' => 'أمان: مشرف المنصة العام محظور من تنفيذ العمليات التشغيلية والمالية داخل الشركات المستأجرة.',
            ], 403);
        }

        // مالك الشركة (company_owner) يمتلك صلاحيات تشغيلية كاملة داخل شركته فقط
        $effectiveUserRoles = $roleAliases[$userRole] ?? [$userRole];
        $isAuthorized = $userRole === 'company_owner'
            || ($userRole === 'platform_admin' && $isPlatformSubscriptionAdminRoute && in_array('platform_admin', $allowedRoles, true))
            || !empty(array_intersect($effectiveUserRoles, $allowedRoles));

        if ($isAuthorized) {
            return $next($request);
        }

        return response()->json([
            'error' => 'UnauthorizedRole',
            'message' => 'أمان: ليس لديك الصلاحية الكافية لتنفيذ هذا الإجراء الحساس (دورك الحالي: ' . $userRole . ').',
            'required_roles' => $allowedRoles,
        ], 403);
    }

    /**
     * Resolve the fine-grained permission for role-protected tenant API routes.
     * Role middleware remains the upper boundary; this check applies the user's
     * effective permission set as a second, server-side authorization gate.
     */
    public function permissionForRequest(Request $request): ?string
    {
        $uri = $request->route()?->uri() ?? $request->path();
        $uri = preg_replace('#^api/v[0-9]+/#', '', ltrim($uri, '/'));
        $segments = explode('/', $uri);
        $root = $segments[0] ?? '';
        $method = strtoupper($request->method());
        $path = strtolower($uri);

        $isRead = in_array($method, ['GET', 'HEAD'], true);

        if ($root === 'tenant') {
            if (
                str_starts_with($path, 'tenant/users')
                || str_starts_with($path, 'tenant/roles')
                || str_starts_with($path, 'tenant/permissions-catalog')
            ) {
                return 'admin.users';
            }
            if (str_starts_with($path, 'tenant/backup')) {
                return 'admin.backup';
            }
            if (str_starts_with($path, 'tenant/subscription')) {
                return 'admin.settings';
            }
            if (str_starts_with($path, 'tenant/settings/costing')) {
                return $isRead ? 'costing.view' : 'costing.manage';
            }
            if (str_starts_with($path, 'tenant/settings/tax')) {
                return $isRead ? 'accounting.view' : 'accounting.post';
            }
            if ($path === 'tenant/profile') {
                return 'admin.settings';
            }
            return null;
        }

        if ($root === 'branches') {
            return $isRead ? 'branches.view' : 'admin.settings';
        }
        if (in_array($root, ['categories', 'clothing-categories', 'size-categories', 'sizes', 'colors', 'models', 'garment-models'], true)) {
            return 'production.manage';
        }
        if ($root === 'products') {
            return $isRead ? 'sales.view' : 'sales.create';
        }
        if (in_array($root, ['warehouses', 'warehouse-types'], true)) {
            return $isRead ? 'inventory.view' : 'admin.settings';
        }
        if ($root === 'inventory') {
            if ($isRead) {
                return 'inventory.view';
            }
            if (str_contains($path, 'transactions') && in_array($method, ['POST', 'PUT', 'PATCH'], true)) {
                return strtolower((string) $request->input('transaction_type')) === 'goods_receipt'
                    ? 'inventory.receive'
                    : 'inventory.dispatch';
            }
            if (str_contains($path, 'items') || str_contains($path, 'units')) {
                return 'inventory.manage';
            }
            return str_contains($path, 'receive') || str_contains($path, 'receipt')
                ? 'inventory.receive'
                : 'inventory.dispatch';
        }
        if (in_array($root, ['suppliers', 'purchase-orders', 'procurement', 'goods-receipts', 'supplier-invoices'], true)) {
            return $isRead ? 'procurement.view' : 'procurement.create';
        }
        if ($root === 'boms') {
            return $isRead ? 'costing.view' : 'costing.manage';
        }
        if ($root === 'production-orders' || $root === 'bundles') {
            return 'production.manage';
        }
        if ($root === 'cutting-orders') {
            if (str_contains($path, 'issue')) {
                return 'cutting.issue';
            }
            return $isRead ? 'cutting.view' : 'cutting.create';
        }
        if ($root === 'quality-inspections') {
            if (str_contains($path, 'approve')) {
                return 'qc.approve';
            }
            if (str_contains($path, 'reject')) {
                return 'qc.reject';
            }
            return 'qc.inspect';
        }
        if ($root === 'subcontracting') {
            if (str_contains($path, '/pay') || str_contains($path, 'invoice-payment')) {
                return 'subcontracting.payments';
            }
            return $isRead ? 'subcontracting.view' : 'subcontracting.manage';
        }
        if (in_array($root, ['sales', 'sales-orders', 'pos', 'customers'], true)) {
            if (str_contains($path, 'discount')) {
                return 'sales.discount';
            }
            return $isRead ? 'sales.view' : 'sales.create';
        }
        if ($root === 'accounting') {
            return $isRead ? 'accounting.view' : 'accounting.post';
        }
        if ($root === 'hr') {
            if (str_contains($path, 'payroll') || str_contains($path, 'salary')) {
                return 'hr.payroll';
            }
            return $isRead ? 'hr.view' : 'hr.manage';
        }
        if ($root === 'storefront') {
            return $isRead ? 'storefront.view' : 'storefront.manage';
        }
        if ($root === 'maintenance') {
            return $isRead ? 'maintenance.view' : 'maintenance.manage';
        }
        if ($root === 'waslat-worsh') {
            if (str_contains($path, 'payment') || str_contains($path, 'commission')) {
                return 'waslat_worsh.payments';
            }
            return $isRead ? 'waslat_worsh.view' : 'waslat_worsh.manage';
        }
        if ($root === 'subscription') {
            return 'admin.settings';
        }
        if ($root === 'admin') {
            return 'admin.users';
        }

        return null;
    }
}

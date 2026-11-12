<?php

use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Middleware\IdentifyTenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| GarmentOS Cloud — مسارات واجهة برمجة التطبيقات v1
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    // فحص صحة النظام الشامل ومراقبة الجاهزية (Comprehensive Health, Liveness & Readiness Probes)
    Route::get('/health', [\App\Http\Controllers\Api\HealthController::class, 'check']);
    Route::get('/health/liveness', [\App\Http\Controllers\Api\HealthController::class, 'liveness']);
    Route::get('/health/readiness', [\App\Http\Controllers\Api\HealthController::class, 'readiness']);

    // المصادقة والتسجيل مع الحماية من الهجمات بالتخمين (Rate Limiting)
    Route::post('/auth/register-company', [TenantController::class, 'register'])->middleware('throttle:auth');
    Route::post('/auth/register-requester', [TenantController::class, 'registerRequester'])->middleware('throttle:auth');
    Route::post('/auth/login', [TenantController::class, 'login'])->middleware('throttle:auth');
    Route::post('/auth/logout', [TenantController::class, 'logout'])->middleware('auth:sanctum');

    // التواصل والاستفسارات العامة من الموقع التسويقي (Public Contact Inquiry)
    Route::post('/public/contact', function (\Illuminate\Http\Request $request) {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:50',
            'company_name' => 'nullable|string|max:255',
            'subject' => 'nullable|string|max:255',
            'message' => 'required|string|min:10|max:2000',
        ]);

        \Illuminate\Support\Facades\Log::info('Public contact inquiry received', [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'company' => $validated['company_name'] ?? null,
            'ip' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم استلام رسالتك بنجاح، وسيتواصل معك فريق GarmentOS Cloud في أقرب وقت.',
        ], 200);
    })->middleware('throttle:5,1');

    // استلام إشعارات الدفع الموقعة من بوابات الدفع الإلكتروني (Verified Webhook with throttle)
    Route::middleware('throttle:webhooks')->group(function () {
        Route::post('/subscriptions/webhook/stripe', [\App\Http\Controllers\Api\SubscriptionWebhookController::class, 'handleWebhook'])->defaults('provider', 'stripe');
        Route::post('/subscriptions/webhook/paymob', [\App\Http\Controllers\Api\SubscriptionWebhookController::class, 'handleWebhook'])->defaults('provider', 'paymob');
        Route::post('/webhooks/subscription-payment', [\App\Http\Controllers\Api\SubscriptionWebhookController::class, 'handleWebhook']);
        Route::post('/subscriptions/webhook', [\App\Http\Controllers\Api\SubscriptionWebhookController::class, 'handleWebhook']);
    });

    // مسارات إدارة المنصة العليا (Platform Administration) - مسار تفويض مخصص بدون سياق شركة مستأجرة
    Route::middleware(['auth:sanctum', \App\Http\Middleware\EnsurePlatformAdmin::class, 'throttle:admin'])->group(function () {
        Route::get('/platform-admin/overview', [\App\Http\Controllers\Api\PlatformAdminController::class, 'overview']);
        Route::get('/platform-admin/tenants', [\App\Http\Controllers\Api\PlatformAdminController::class, 'tenants']);
        Route::get('/platform-admin/tenants/{id}', [\App\Http\Controllers\Api\PlatformAdminController::class, 'showTenant']);
        Route::post('/platform-admin/tenants/{id}/suspend', [\App\Http\Controllers\Api\PlatformAdminController::class, 'suspendTenant']);
        Route::post('/platform-admin/tenants/{id}/reactivate', [\App\Http\Controllers\Api\PlatformAdminController::class, 'reactivateTenant']);
        Route::put('/platform-admin/tenants/{id}/plan', [\App\Http\Controllers\Api\PlatformAdminController::class, 'updateTenantPlan']);
        Route::get('/platform-admin/system-health', [\App\Http\Controllers\Api\PlatformAdminController::class, 'systemHealth']);
        Route::get('/platform-admin/users', [\App\Http\Controllers\Api\PlatformAdminController::class, 'users']);
        Route::get('/platform-admin/audit-logs', [\App\Http\Controllers\Api\PlatformAdminController::class, 'auditLogs']);
        Route::post('/platform-admin/tenants/{id}/activate-subscription', [\App\Http\Controllers\Api\PlatformAdminController::class, 'activateSubscription']);
        Route::post('/platform-admin/tenants/{id}/subscription/manual-activate', [\App\Http\Controllers\Api\PlatformAdminController::class, 'activateSubscription']);
        Route::post('/admin/tenants/{id}/activate-subscription', [\App\Http\Controllers\Api\PlatformAdminController::class, 'activateSubscription']);

        // طابور مراجعة واعتماد طلبات السداد اليدوية المركزية (Stage C.4: Platform Admin Subscription Approval Queue)
        Route::get('/platform-admin/subscription-requests', [\App\Http\Controllers\Api\SubscriptionPaymentRequestController::class, 'adminList']);
        Route::get('/platform-admin/subscription-requests/{id}/receipt', [\App\Http\Controllers\Api\SubscriptionPaymentRequestController::class, 'adminReceipt']);
        Route::post('/platform-admin/subscription-requests/{id}/approve', [\App\Http\Controllers\Api\SubscriptionPaymentRequestController::class, 'adminApprove']);
        Route::post('/platform-admin/subscription-requests/{id}/reject', [\App\Http\Controllers\Api\SubscriptionPaymentRequestController::class, 'adminReject']);

        // إدارة باقات وصلة ورش وحصص طلبات القص (P2: Platform Admin Waslat Worsh Packages)
        Route::get('/platform-admin/packages', [\App\Http\Controllers\Api\SubscriptionPaymentRequestController::class, 'adminPackages']);
        Route::post('/platform-admin/packages', [\App\Http\Controllers\Api\SubscriptionPaymentRequestController::class, 'adminStorePackage']);
        Route::put('/platform-admin/packages/{id}', [\App\Http\Controllers\Api\SubscriptionPaymentRequestController::class, 'adminUpdatePackage']);
        Route::patch('/platform-admin/packages/{id}/toggle-active', [\App\Http\Controllers\Api\SubscriptionPaymentRequestController::class, 'adminTogglePackageActive']);

        // النظام الموحد لإدارة باقات وميزات GarmentOS ERP و Waslat Worsh (Unified SaaS Plans & Features)
        Route::get('/platform-admin/saas/packages', [\App\Http\Controllers\Api\SaasPackageManagementController::class, 'adminPackages']);
        Route::post('/platform-admin/saas/packages', [\App\Http\Controllers\Api\SaasPackageManagementController::class, 'adminStorePackage']);
        Route::put('/platform-admin/saas/packages/{id}', [\App\Http\Controllers\Api\SaasPackageManagementController::class, 'adminUpdatePackage']);
        Route::post('/platform-admin/saas/packages/{id}/duplicate', [\App\Http\Controllers\Api\SaasPackageManagementController::class, 'adminDuplicatePackage']);
        Route::patch('/platform-admin/saas/packages/{id}/toggle-active', [\App\Http\Controllers\Api\SaasPackageManagementController::class, 'adminToggleActive']);
        Route::patch('/platform-admin/saas/packages/{id}/toggle-public', [\App\Http\Controllers\Api\SaasPackageManagementController::class, 'adminTogglePublic']);
        Route::post('/platform-admin/saas/packages/{id}/archive', [\App\Http\Controllers\Api\SaasPackageManagementController::class, 'adminArchivePackage']);
        Route::get('/platform-admin/saas/packages/{id}/subscribers', [\App\Http\Controllers\Api\SaasPackageManagementController::class, 'adminPackageSubscribers']);

        Route::get('/platform-admin/saas/features', [\App\Http\Controllers\Api\SaasPackageManagementController::class, 'adminFeatures']);
        Route::post('/platform-admin/saas/features', [\App\Http\Controllers\Api\SaasPackageManagementController::class, 'adminStoreFeature']);
        Route::put('/platform-admin/saas/features/{id}', [\App\Http\Controllers\Api\SaasPackageManagementController::class, 'adminUpdateFeature']);
        Route::patch('/platform-admin/saas/features/{id}/toggle-active', [\App\Http\Controllers\Api\SaasPackageManagementController::class, 'adminToggleFeatureActive']);
        Route::patch('/platform-admin/saas/features/{id}/toggle-public', [\App\Http\Controllers\Api\SaasPackageManagementController::class, 'adminToggleFeaturePublic']);

        Route::get('/platform-admin/saas/metrics', [\App\Http\Controllers\Api\SaasPackageManagementController::class, 'adminMetrics']);

        // إدارة النطاقات وتوجيه المستأجرين (Domain & Subdomain Management)
        Route::get('/platform-admin/domains', [\App\Http\Controllers\Api\PlatformAdminController::class, 'domains']);
        Route::put('/platform-admin/tenants/{id}/subdomain', [\App\Http\Controllers\Api\PlatformAdminController::class, 'updateSubdomain']);
        Route::put('/platform-admin/tenants/{id}/custom-domain', [\App\Http\Controllers\Api\PlatformAdminController::class, 'updateCustomDomain']);
        Route::post('/platform-admin/tenants/{id}/custom-domain/verify', [\App\Http\Controllers\Api\PlatformAdminController::class, 'verifyCustomDomain']);
        Route::post('/platform-admin/tenants/{id}/custom-domain/toggle', [\App\Http\Controllers\Api\PlatformAdminController::class, 'toggleDomainStatus']);
    });

    // المسارات المحمية بعزل الشركات
    Route::middleware(['auth:sanctum', IdentifyTenant::class, \App\Http\Middleware\EnsurePermission::class])->group(function () {
        Route::get('/tenant/profile', [TenantController::class, 'current']);
        Route::put('/tenant/profile', [TenantController::class, 'updateProfile'])->middleware('role:company_owner');
        Route::get('/tenant/permissions-catalog', [TenantController::class, 'getPermissionsCatalog']);
        Route::get('/tenant/roles', [TenantController::class, 'getRolesWithPermissions'])->middleware('role:company_owner');
        Route::put('/tenant/roles/{roleKey}', [TenantController::class, 'updateRolePermissions'])->middleware('role:company_owner');
        Route::get('/tenant/users', [TenantController::class, 'getUsers'])->middleware('role:company_owner');
        Route::post('/tenant/users', [TenantController::class, 'createUser'])->middleware(['role:company_owner', 'quota:active_users']);
        Route::put('/tenant/users/{id}', [TenantController::class, 'updateUser'])->middleware('role:company_owner');
        Route::post('/tenant/users/{id}/toggle-active', [TenantController::class, 'toggleUserActive'])->middleware('role:company_owner');
        Route::delete('/tenant/users/{id}', [TenantController::class, 'deleteUser'])->middleware('role:company_owner');
        Route::post('/tenant/subscription/activate', [TenantController::class, 'activateSubscription']);

        // دورة رفع إثباتات السداد ومتابعة الحصص (Stage C.4: Customer Payment Requests & Subscriptions)
        Route::post('/subscriptions/payment-requests', [\App\Http\Controllers\Api\SubscriptionPaymentRequestController::class, 'submitPaymentRequest']);
        Route::get('/subscriptions/payment-requests/my-latest', [\App\Http\Controllers\Api\SubscriptionPaymentRequestController::class, 'myLatest']);
        Route::get('/subscriptions/my-status', [\App\Http\Controllers\Api\SubscriptionPaymentRequestController::class, 'myStatus']);
        Route::get('/tenant/settings/costing', [TenantController::class, 'getCostingSettings']);
        Route::put('/tenant/settings/costing', [TenantController::class, 'updateCostingSettings'])->middleware('role:company_owner,accountant');
        Route::get('/tenant/settings/tax', [TenantController::class, 'getTaxSettings']);
        Route::put('/tenant/settings/tax', [TenantController::class, 'updateTaxSettings'])->middleware('role:company_owner,accountant');

        // إدارة النسخ الاحتياطي وأمان البيانات (Database Backup & Disaster Recovery)
        Route::get('/tenant/backup/status', [TenantController::class, 'backupStatus'])->middleware('role:company_owner');
        Route::get('/tenant/backup/download', [TenantController::class, 'downloadBackup'])->middleware('role:company_owner');

        // الفروع ومواقع العمل (Branches - Batch 2A)
        Route::get('/branches', [BranchController::class, 'index'])->middleware('role:company_owner,production_manager,inventory_custodian,warehouse_manager,accountant,quality_controller,sales_rep');
        Route::post('/branches', [BranchController::class, 'store'])->middleware(['role:company_owner', 'quota:active_branches']);
        Route::get('/branches/{id}', [BranchController::class, 'show'])->middleware('role:company_owner,production_manager,inventory_custodian,warehouse_manager,accountant,quality_controller,sales_rep');
        Route::put('/branches/{id}', [BranchController::class, 'update'])->middleware('role:company_owner');
        Route::delete('/branches/{id}', [BranchController::class, 'destroy'])->middleware('role:company_owner');

        // تصنيفات الملابس المستقلة لكل مصنع (Clothing Categories - Batch 1)
        Route::get('/categories', [\App\Http\Controllers\Api\ClothingCategoryController::class, 'index']);
        Route::post('/categories', [\App\Http\Controllers\Api\ClothingCategoryController::class, 'store'])->middleware('role:company_owner,production_manager');
        Route::get('/categories/{id}', [\App\Http\Controllers\Api\ClothingCategoryController::class, 'show']);
        Route::put('/categories/{id}', [\App\Http\Controllers\Api\ClothingCategoryController::class, 'update'])->middleware('role:company_owner,production_manager');
        Route::delete('/categories/{id}', [\App\Http\Controllers\Api\ClothingCategoryController::class, 'destroy'])->middleware('role:company_owner,production_manager');

        // Aliases for /clothing-categories
        Route::get('/clothing-categories', [\App\Http\Controllers\Api\ClothingCategoryController::class, 'index']);
        Route::post('/clothing-categories', [\App\Http\Controllers\Api\ClothingCategoryController::class, 'store'])->middleware('role:company_owner,production_manager');
        Route::get('/clothing-categories/{id}', [\App\Http\Controllers\Api\ClothingCategoryController::class, 'show']);
        Route::put('/clothing-categories/{id}', [\App\Http\Controllers\Api\ClothingCategoryController::class, 'update'])->middleware('role:company_owner,production_manager');
        Route::delete('/clothing-categories/{id}', [\App\Http\Controllers\Api\ClothingCategoryController::class, 'destroy'])->middleware('role:company_owner,production_manager');

        // دليل وتصنيفات المقاسات المعتمدة (Dynamic Size Guide & Categories)
        Route::get('/size-categories', [\App\Http\Controllers\Api\SizeCategoryController::class, 'index']);
        Route::post('/size-categories', [\App\Http\Controllers\Api\SizeCategoryController::class, 'store'])->middleware('role:company_owner,production_manager');
        Route::get('/size-categories/{id}', [\App\Http\Controllers\Api\SizeCategoryController::class, 'show']);
        Route::put('/size-categories/{id}', [\App\Http\Controllers\Api\SizeCategoryController::class, 'update'])->middleware('role:company_owner,production_manager');
        Route::delete('/size-categories/{id}', [\App\Http\Controllers\Api\SizeCategoryController::class, 'destroy'])->middleware('role:company_owner,production_manager');

        // المقاسات المعتمدة وإدارتها (Sizes - Batch 1)
        Route::get('/sizes', [\App\Http\Controllers\Api\SizeController::class, 'index']);
        Route::post('/sizes', [\App\Http\Controllers\Api\SizeController::class, 'store'])->middleware('role:company_owner,production_manager');
        Route::get('/sizes/{id}', [\App\Http\Controllers\Api\SizeController::class, 'show']);
        Route::put('/sizes/{id}', [\App\Http\Controllers\Api\SizeController::class, 'update'])->middleware('role:company_owner,production_manager');
        Route::delete('/sizes/{id}', [\App\Http\Controllers\Api\SizeController::class, 'destroy'])->middleware('role:company_owner,production_manager');

        // الألوان المعتمدة وإدارتها (Colors - Batch 1)
        Route::get('/colors', [\App\Http\Controllers\Api\ColorController::class, 'index']);
        Route::post('/colors', [\App\Http\Controllers\Api\ColorController::class, 'store'])->middleware('role:company_owner,production_manager');
        Route::get('/colors/{id}', [\App\Http\Controllers\Api\ColorController::class, 'show']);
        Route::put('/colors/{id}', [\App\Http\Controllers\Api\ColorController::class, 'update'])->middleware('role:company_owner,production_manager');
        Route::delete('/colors/{id}', [\App\Http\Controllers\Api\ColorController::class, 'destroy'])->middleware('role:company_owner,production_manager');

        // كتالوج موديلات الملابس والمتغيرات (Garment Models)
        Route::get('/models', [\App\Http\Controllers\Api\GarmentModelController::class, 'index']);
        Route::post('/models', [\App\Http\Controllers\Api\GarmentModelController::class, 'store'])->middleware(['role:company_owner,production_manager', 'quota:garment_models']);
        Route::get('/models/{id}', [\App\Http\Controllers\Api\GarmentModelController::class, 'show']);
        Route::put('/models/{id}', [\App\Http\Controllers\Api\GarmentModelController::class, 'update'])->middleware('role:company_owner,production_manager');
        Route::delete('/models/{id}', [\App\Http\Controllers\Api\GarmentModelController::class, 'destroy'])->middleware('role:company_owner,production_manager');

        // Aliases for /garment-models
        Route::get('/garment-models', [\App\Http\Controllers\Api\GarmentModelController::class, 'index']);
        Route::post('/garment-models', [\App\Http\Controllers\Api\GarmentModelController::class, 'store'])->middleware(['role:company_owner,production_manager', 'quota:garment_models']);
        Route::get('/garment-models/{id}', [\App\Http\Controllers\Api\GarmentModelController::class, 'show']);
        Route::put('/garment-models/{id}', [\App\Http\Controllers\Api\GarmentModelController::class, 'update'])->middleware('role:company_owner,production_manager');
        Route::delete('/garment-models/{id}', [\App\Http\Controllers\Api\GarmentModelController::class, 'destroy'])->middleware('role:company_owner,production_manager');

        // إدارة المنتجات التجارية للبيع والمتاجر (Products - Batch 1 WooCommerce-level)
        Route::get('/products', [\App\Http\Controllers\Api\ProductController::class, 'index']);
        Route::get('/products/pos-items', [\App\Http\Controllers\Api\ProductController::class, 'posItems']);
        Route::post('/products/upload-image', [\App\Http\Controllers\Api\ProductController::class, 'uploadImage'])->middleware('role:company_owner,production_manager,sales_rep');
        Route::post('/products/upload-images', [\App\Http\Controllers\Api\ProductController::class, 'uploadImages'])->middleware('role:company_owner,production_manager,sales_rep');
        Route::post('/products/delete-image', [\App\Http\Controllers\Api\ProductController::class, 'deleteImage'])->middleware('role:company_owner,production_manager,sales_rep');
        Route::post('/products', [\App\Http\Controllers\Api\ProductController::class, 'store'])->middleware('role:company_owner,production_manager,sales_rep');
        Route::get('/products/{id}', [\App\Http\Controllers\Api\ProductController::class, 'show']);
        Route::put('/products/{id}', [\App\Http\Controllers\Api\ProductController::class, 'update'])->middleware('role:company_owner,production_manager,sales_rep');
        Route::delete('/products/{id}', [\App\Http\Controllers\Api\ProductController::class, 'destroy'])->middleware('role:company_owner,production_manager');

        // المخازن ودفتر الأستاذ المخزني والتحويلات والجرد وأمانات العملاء (Batch 2)
        Route::get('/warehouses', [\App\Http\Controllers\Api\InventoryController::class, 'warehouses'])->middleware('role:company_owner,production_manager,inventory_custodian,warehouse_manager,accountant,quality_controller,sales_rep');
        Route::post('/warehouses', [\App\Http\Controllers\Api\InventoryController::class, 'storeWarehouse'])->middleware(['role:company_owner', 'quota:active_warehouses']);
        Route::put('/warehouses/{id}', [\App\Http\Controllers\Api\InventoryController::class, 'updateWarehouse'])->middleware('role:company_owner');
        Route::delete('/warehouses/{id}', [\App\Http\Controllers\Api\InventoryController::class, 'destroyWarehouse'])->middleware('role:company_owner');
        Route::get('/warehouse-types', [\App\Http\Controllers\Api\InventoryController::class, 'warehouseTypes'])->middleware('role:company_owner,production_manager,inventory_custodian,warehouse_manager,accountant,quality_controller,sales_rep');
        Route::post('/warehouse-types', [\App\Http\Controllers\Api\InventoryController::class, 'storeWarehouseType'])->middleware('role:company_owner');

        // وحدات القياس (Units of Measure - Batch 2B)
        Route::get('/inventory/units', [\App\Http\Controllers\Api\InventoryController::class, 'units']);
        Route::post('/inventory/units', [\App\Http\Controllers\Api\InventoryController::class, 'storeUnit'])->middleware('role:company_owner,accountant,production_manager');

        // كروت الأصناف المخزنية ودفتر الأستاذ (Inventory Items & Ledger - Batch 2B, 2C)
        Route::get('/inventory/items', [\App\Http\Controllers\Api\InventoryController::class, 'items'])->middleware('role:company_owner,production_manager,inventory_custodian,warehouse_manager,accountant,quality_controller,sales_rep');
        Route::post('/inventory/items', [\App\Http\Controllers\Api\InventoryController::class, 'storeItem'])->middleware('role:company_owner,accountant,production_manager,warehouse_manager,inventory_custodian');
        Route::put('/inventory/items/{id}', [\App\Http\Controllers\Api\InventoryController::class, 'updateItem'])->middleware('role:company_owner,accountant,production_manager,warehouse_manager,inventory_custodian');
        Route::delete('/inventory/items/{id}', [\App\Http\Controllers\Api\InventoryController::class, 'destroyItem'])->middleware('role:company_owner,accountant,production_manager,warehouse_manager');
        Route::get('/inventory/items/{id}/label', [\App\Http\Controllers\Api\InventoryController::class, 'itemLabel'])->middleware('role:company_owner,production_manager,inventory_custodian,warehouse_manager,accountant,quality_controller,sales_rep');
        Route::get('/inventory/items/{id}/stock-card', [\App\Http\Controllers\Api\InventoryController::class, 'stockCard'])->middleware('role:company_owner,production_manager,inventory_custodian,warehouse_manager,accountant,quality_controller,sales_rep');
        Route::post('/inventory/transactions', [\App\Http\Controllers\Api\InventoryController::class, 'recordTransaction'])->middleware('role:accountant,production_manager,inventory_custodian,worker');
        Route::get('/inventory/transactions', [\App\Http\Controllers\Api\InventoryController::class, 'transactions'])->middleware('role:company_owner,production_manager,inventory_custodian,warehouse_manager,accountant,quality_controller,sales_rep');
        Route::post('/inventory/convert-fabric', [\App\Http\Controllers\Api\InventoryController::class, 'convertFabric'])->middleware('role:accountant,production_manager,inventory_custodian');
        Route::get('/inventory/customer-materials', [\App\Http\Controllers\Api\InventoryController::class, 'customerMaterials']);
        Route::post('/inventory/customer-materials', [\App\Http\Controllers\Api\InventoryController::class, 'receiveCustomerMaterial'])->middleware('role:accountant,production_manager,inventory_custodian');
        Route::post('/inventory/customer-materials/{id}/consume', [\App\Http\Controllers\Api\InventoryController::class, 'consumeCustomerMaterial'])->middleware('role:accountant,production_manager,inventory_custodian');

        // تحويلات المخازن (Stock Transfers - Batch 2D)
        Route::get('/inventory/transfers', [\App\Http\Controllers\Api\StockTransferController::class, 'index']);
        Route::post('/inventory/transfers', [\App\Http\Controllers\Api\StockTransferController::class, 'store'])->middleware('role:company_owner,production_manager,warehouse_manager,inventory_custodian');
        Route::get('/inventory/transfers/{id}', [\App\Http\Controllers\Api\StockTransferController::class, 'show']);
        Route::post('/inventory/transfers/{id}/dispatch', [\App\Http\Controllers\Api\StockTransferController::class, 'dispatch'])->middleware('role:company_owner,warehouse_manager,inventory_custodian');
        Route::post('/inventory/transfers/{id}/receive', [\App\Http\Controllers\Api\StockTransferController::class, 'receive'])->middleware('role:company_owner,warehouse_manager,inventory_custodian');

        // الجرد الفعلي للمخازن (Physical Stock Counts & Adjustments - Batch 2D)
        Route::get('/inventory/counts', [\App\Http\Controllers\Api\StockCountController::class, 'index']);
        Route::post('/inventory/counts', [\App\Http\Controllers\Api\StockCountController::class, 'store'])->middleware('role:company_owner,accountant,warehouse_manager');
        Route::get('/inventory/counts/{id}', [\App\Http\Controllers\Api\StockCountController::class, 'show']);
        Route::put('/inventory/counts/{id}/record', [\App\Http\Controllers\Api\StockCountController::class, 'record'])->middleware('role:company_owner,accountant,warehouse_manager');
        Route::post('/inventory/counts/{id}/approve', [\App\Http\Controllers\Api\StockCountController::class, 'approve'])->middleware('role:company_owner,accountant');

        // المشتريات والموردين وفحص الاستلام والفواتير (Procurement - Batch 2E, 2F, 2G)
        Route::get('/suppliers', [\App\Http\Controllers\Api\SupplierController::class, 'index']);
        Route::post('/suppliers', [\App\Http\Controllers\Api\SupplierController::class, 'store']);
        Route::get('/suppliers/{id}', [\App\Http\Controllers\Api\SupplierController::class, 'show']);
        Route::put('/suppliers/{id}', [\App\Http\Controllers\Api\SupplierController::class, 'update']);
        Route::get('/suppliers/{id}/statement', [\App\Http\Controllers\Api\SupplierController::class, 'statement']);
        Route::post('/suppliers/{id}/payments', [\App\Http\Controllers\Api\SupplierController::class, 'recordPayment'])->middleware('role:company_owner,accountant');
        Route::put('/suppliers/{id}/payments/{voucherId}', [\App\Http\Controllers\Api\SupplierController::class, 'updatePayment'])->middleware('role:company_owner,accountant');
        Route::delete('/suppliers/{id}/payments/{voucherId}', [\App\Http\Controllers\Api\SupplierController::class, 'deletePayment'])->middleware('role:company_owner,accountant');
        Route::post('/suppliers/{id}/invoices', [\App\Http\Controllers\Api\SupplierController::class, 'recordInvoice'])->middleware('role:company_owner,accountant');
        Route::delete('/suppliers/{id}/invoices/{invoiceId}', [\App\Http\Controllers\Api\SupplierController::class, 'deleteInvoice'])->middleware('role:company_owner,accountant');
        Route::post('/suppliers/{id}/discounts', [\App\Http\Controllers\Api\SupplierController::class, 'recordDiscount'])->middleware('role:company_owner,accountant');

        Route::get('/purchase-orders', [\App\Http\Controllers\Api\PurchaseOrderController::class, 'index']);
        Route::post('/purchase-orders', [\App\Http\Controllers\Api\PurchaseOrderController::class, 'store'])->middleware(['role:accountant,production_manager', 'quota:purchase_orders']);
        Route::get('/purchase-orders/{id}', [\App\Http\Controllers\Api\PurchaseOrderController::class, 'show']);
        Route::post('/purchase-orders/{id}/approve', [\App\Http\Controllers\Api\PurchaseOrderController::class, 'approve'])->middleware('role:accountant');

        // طلبات الشراء واعتمادها وتحويلها (Purchase Requisitions - Batch 6)
        Route::get('/procurement/requisitions', [\App\Http\Controllers\Api\PurchaseRequisitionController::class, 'index']);
        Route::post('/procurement/requisitions', [\App\Http\Controllers\Api\PurchaseRequisitionController::class, 'store']);
        Route::get('/procurement/requisitions/{id}', [\App\Http\Controllers\Api\PurchaseRequisitionController::class, 'show']);
        Route::post('/procurement/requisitions/{id}/submit', [\App\Http\Controllers\Api\PurchaseRequisitionController::class, 'submit']);
        Route::post('/procurement/requisitions/{id}/approve', [\App\Http\Controllers\Api\PurchaseRequisitionController::class, 'approve']);
        Route::post('/procurement/requisitions/{id}/reject', [\App\Http\Controllers\Api\PurchaseRequisitionController::class, 'reject']);
        Route::post('/procurement/requisitions/{id}/convert', [\App\Http\Controllers\Api\PurchaseRequisitionController::class, 'convert'])->middleware(['role:company_owner,production_manager,accountant', 'quota:purchase_orders']);
        Route::post('/procurement/requisitions/{id}/cancel', [\App\Http\Controllers\Api\PurchaseRequisitionController::class, 'cancel']);

        Route::get('/goods-receipts', [\App\Http\Controllers\Api\GoodsReceiptController::class, 'index']);
        Route::post('/goods-receipts', [\App\Http\Controllers\Api\GoodsReceiptController::class, 'store'])->middleware('role:inventory_custodian,production_manager,accountant');
        Route::get('/goods-receipts/{id}', [\App\Http\Controllers\Api\GoodsReceiptController::class, 'show']);

        Route::get('/supplier-invoices', [\App\Http\Controllers\Api\SupplierInvoiceController::class, 'index']);
        Route::post('/supplier-invoices', [\App\Http\Controllers\Api\SupplierInvoiceController::class, 'store'])->middleware('role:accountant');

        // تخطيط وتشغيل الإنتاج والـ BOM وصالة القص وبطاقات الحزم والجودة
        Route::get('/boms', [\App\Http\Controllers\Api\BillOfMaterialController::class, 'index']);
        Route::post('/boms', [\App\Http\Controllers\Api\BillOfMaterialController::class, 'store'])->middleware('role:production_manager');
        Route::post('/boms/{id}/approve', [\App\Http\Controllers\Api\BillOfMaterialController::class, 'approve'])->middleware('role:production_manager');

        Route::get('/production-orders', [\App\Http\Controllers\Api\ProductionOrderController::class, 'index']);
        Route::post('/production-orders', [\App\Http\Controllers\Api\ProductionOrderController::class, 'store'])->middleware(['role:production_manager', 'quota:production_orders']);
        Route::get('/production-orders/{id}', [\App\Http\Controllers\Api\ProductionOrderController::class, 'show']);
        Route::put('/production-orders/{id}', [\App\Http\Controllers\Api\ProductionOrderController::class, 'update']);
        Route::post('/production-orders/{id}/approve', [\App\Http\Controllers\Api\ProductionOrderController::class, 'approve'])->middleware('role:production_manager');
        Route::post('/production-orders/{id}/complete', [\App\Http\Controllers\Api\ProductionOrderController::class, 'complete'])->middleware('role:company_owner,production_manager');
        Route::post('/production-orders/{id}/cancel', [\App\Http\Controllers\Api\ProductionOrderController::class, 'cancel']);
        Route::get('/production-orders/{id}/metrics', [\App\Http\Controllers\Api\ProductionOrderController::class, 'metrics']);

        Route::get('/cutting-orders', [\App\Http\Controllers\Api\CuttingOrderController::class, 'index']);
        Route::post('/cutting-orders', [\App\Http\Controllers\Api\CuttingOrderController::class, 'store'])->middleware(['role:production_manager', 'quota:cutting_lays']);
        Route::get('/cutting-orders/{id}', [\App\Http\Controllers\Api\CuttingOrderController::class, 'show']);
        Route::post('/cutting-orders/{id}/cancel', [\App\Http\Controllers\Api\CuttingOrderController::class, 'cancel']);
        Route::post('/cutting-orders/{id}/archive', [\App\Http\Controllers\Api\CuttingOrderController::class, 'archive']);

        Route::get('/bundles', [\App\Http\Controllers\Api\BundleController::class, 'index']);
        Route::get('/bundles/{id}', [\App\Http\Controllers\Api\BundleController::class, 'show']);
        Route::post('/bundles/{id}/assign', [\App\Http\Controllers\Api\BundleController::class, 'assign']);
        Route::get('/bundles/{id}/history', [\App\Http\Controllers\Api\BundleController::class, 'history']);
        Route::post('/bundles/{id}/transfer', [\App\Http\Controllers\Api\BundleController::class, 'transfer']);

        Route::get('/quality-inspections', [\App\Http\Controllers\Api\QualityInspectionController::class, 'index']);
        Route::post('/quality-inspections', [\App\Http\Controllers\Api\QualityInspectionController::class, 'store'])->middleware('role:quality_controller,production_manager');

        // خدمات القص والتصنيع للغير (Phase 6: Subcontracting & CMT Services)
        Route::get('/subcontracting/customers', [\App\Http\Controllers\Api\SubcontractingController::class, 'customers']);
        Route::post('/subcontracting/customers', [\App\Http\Controllers\Api\SubcontractingController::class, 'storeCustomer']);
        Route::get('/subcontracting/customers/{id}', [\App\Http\Controllers\Api\SubcontractingController::class, 'showCustomer']);
        Route::put('/subcontracting/customers/{id}', [\App\Http\Controllers\Api\SubcontractingController::class, 'updateCustomer']);

        Route::get('/subcontracting/jobs', [\App\Http\Controllers\Api\SubcontractingController::class, 'jobs']);
        Route::post('/subcontracting/jobs', [\App\Http\Controllers\Api\SubcontractingController::class, 'storeJob'])->middleware(['role:company_owner,production_manager,accountant', 'quota:subcontract_jobs']);
        Route::get('/subcontracting/jobs/{id}', [\App\Http\Controllers\Api\SubcontractingController::class, 'showJob']);
        Route::post('/subcontracting/jobs/{id}/confirm', [\App\Http\Controllers\Api\SubcontractingController::class, 'confirmJob'])->middleware('role:company_owner,production_manager,accountant');
        Route::get('/subcontracting/jobs/{id}/profitability', [\App\Http\Controllers\Api\SubcontractingController::class, 'profitability']);

        Route::get('/subcontracting/material-receipts', [\App\Http\Controllers\Api\SubcontractingController::class, 'materialReceipts']);
        Route::post('/subcontracting/material-receipts', [\App\Http\Controllers\Api\SubcontractingController::class, 'storeMaterialReceipt']);

        Route::get('/subcontracting/external-operations', [\App\Http\Controllers\Api\SubcontractingController::class, 'externalOperations']);
        Route::post('/subcontracting/external-operations', [\App\Http\Controllers\Api\SubcontractingController::class, 'dispatchExternalOperation']);
        Route::post('/subcontracting/external-operations/{id}/receive', [\App\Http\Controllers\Api\SubcontractingController::class, 'receiveExternalOperation']);

        Route::get('/subcontracting/delivery-notes', [\App\Http\Controllers\Api\SubcontractingController::class, 'deliveryNotes']);
        Route::post('/subcontracting/delivery-notes', [\App\Http\Controllers\Api\SubcontractingController::class, 'storeDeliveryNote']);

        Route::get('/subcontracting/invoices', [\App\Http\Controllers\Api\SubcontractingController::class, 'invoices']);
        Route::post('/subcontracting/invoices', [\App\Http\Controllers\Api\SubcontractingController::class, 'storeInvoice'])->middleware('role:company_owner,accountant');
        Route::post('/subcontracting/invoices/{id}/pay', [\App\Http\Controllers\Api\SubcontractingController::class, 'recordPayment'])->middleware('role:company_owner,accountant');

        // المبيعات ونقاط البيع وحجز المخزون (Phase 7: Sales & POS)
        Route::get('/sales/quotations', [\App\Http\Controllers\Api\SalesController::class, 'quotations']);
        Route::post('/sales/quotations', [\App\Http\Controllers\Api\SalesController::class, 'storeQuotation'])->middleware('role:company_owner,sales_rep,sales_officer,sales_manager,sales_officer');
        Route::post('/sales/quotations/{id}/convert', [\App\Http\Controllers\Api\SalesController::class, 'convertQuotation'])->middleware('role:company_owner,sales_rep,sales_officer,sales_manager,sales_officer');
        Route::get('/sales/orders', [\App\Http\Controllers\Api\SalesController::class, 'salesOrders']);
        Route::get('/sales/orders/{id}', [\App\Http\Controllers\Api\SalesController::class, 'showSalesOrder']);
        Route::post('/sales/orders', [\App\Http\Controllers\Api\SalesController::class, 'storeSalesOrder'])->middleware(['role:company_owner,sales_rep,sales_officer,sales_manager,sales_officer', 'quota:sales_orders']);
        Route::post('/sales/orders/{id}/cancel', [\App\Http\Controllers\Api\SalesController::class, 'cancelSalesOrder'])->middleware('role:company_owner,sales_rep,sales_officer,accountant,sales_manager,sales_officer');
        Route::post('/sales/orders/{id}/deliver', [\App\Http\Controllers\Api\SalesController::class, 'deliverOrder'])->middleware('role:company_owner,sales_rep,sales_officer,production_manager,sales_manager,sales_officer');
        Route::get('/sales-orders', [\App\Http\Controllers\Api\SalesController::class, 'salesOrders']);
        Route::post('/sales-orders', [\App\Http\Controllers\Api\SalesController::class, 'storeSalesOrder'])->middleware(['role:company_owner,sales_rep,sales_officer,sales_manager', 'quota:sales_orders']);
        Route::post('/sales/orders/{id}/reserve', [\App\Http\Controllers\Api\SalesController::class, 'reserveOrderStock'])->middleware('role:company_owner,sales_rep,sales_officer,inventory_custodian,sales_manager,sales_officer');
        Route::post('/sales/orders/{id}/fulfill', [\App\Http\Controllers\Api\SalesController::class, 'fulfillOrder'])->middleware('role:company_owner,sales_rep,sales_officer,inventory_custodian,sales_manager,sales_officer');
        Route::get('/sales/invoices', [\App\Http\Controllers\Api\SalesController::class, 'invoices'])->middleware('role:company_owner,accountant,financial_accountant,sales_rep,production_manager,sales_manager');
        Route::get('/sales/invoices/{id}', [\App\Http\Controllers\Api\SalesController::class, 'showInvoice'])->middleware('role:company_owner,accountant,financial_accountant,sales_rep,production_manager,sales_manager');
        Route::post('/sales/invoices/{id}/cancel', [\App\Http\Controllers\Api\SalesController::class, 'cancelSalesInvoice'])->middleware('role:company_owner,accountant,financial_accountant,sales_manager');
        Route::post('/pos/sale', [\App\Http\Controllers\Api\SalesController::class, 'posSale'])->middleware('role:company_owner,sales_rep,sales_officer,accountant,sales_manager,sales_officer');
        Route::get('/pos/sessions', [\App\Http\Controllers\Api\SalesController::class, 'posSessions']);
        Route::post('/pos/sessions/open', [\App\Http\Controllers\Api\SalesController::class, 'openPosSession'])->middleware('role:company_owner,sales_rep,sales_officer,accountant,sales_manager,sales_officer');
        Route::post('/pos/sessions/{id}/close', [\App\Http\Controllers\Api\SalesController::class, 'closePosSession'])->middleware('role:company_owner,sales_rep,sales_officer,accountant,sales_manager,sales_officer');
        Route::get('/sales/delivery-notes', [\App\Http\Controllers\Api\SalesController::class, 'deliveryNotes']);
        Route::post('/sales/delivery-notes', [\App\Http\Controllers\Api\SalesController::class, 'storeDeliveryNote'])->middleware('role:company_owner,sales_rep,sales_officer,production_manager,inventory_custodian,sales_manager,sales_officer');
        Route::put('/sales/delivery-notes/{id}', [\App\Http\Controllers\Api\SalesController::class, 'updateDeliveryNote'])->middleware('role:company_owner,sales_rep,sales_officer,production_manager,sales_manager,sales_officer');
        Route::post('/sales/delivery-notes/{id}/cancel', [\App\Http\Controllers\Api\SalesController::class, 'cancelDeliveryNote'])->middleware('role:company_owner,production_manager,sales_manager,sales_officer');
        Route::get('/sales/returns', [\App\Http\Controllers\Api\SalesController::class, 'salesReturns'])->middleware('role:company_owner,accountant,financial_accountant,sales_rep,production_manager,sales_manager');
        Route::get('/sales/returns/{id}', [\App\Http\Controllers\Api\SalesController::class, 'showSalesReturn'])->middleware('role:company_owner,accountant,financial_accountant,sales_rep,production_manager,sales_manager');
        Route::post('/sales/returns', [\App\Http\Controllers\Api\SalesController::class, 'storeSalesReturn'])->middleware('role:company_owner,accountant,financial_accountant,sales_rep,sales_manager');
        Route::post('/sales/returns/{id}/refund', [\App\Http\Controllers\Api\SalesController::class, 'refundSalesReturn'])->middleware('role:company_owner,accountant,financial_accountant,sales_manager');
        Route::get('/sales/payments', [\App\Http\Controllers\Api\SalesController::class, 'payments']);
        Route::post('/sales/payments', [\App\Http\Controllers\Api\SalesController::class, 'storePayment'])->middleware('role:company_owner,accountant,financial_accountant,sales_rep,sales_officer,sales_manager,sales_officer');
        Route::post('/sales/payments/{id}/reverse', [\App\Http\Controllers\Api\SalesController::class, 'reversePayment'])->middleware('role:company_owner,accountant,financial_accountant,sales_manager,sales_officer');
        Route::get('/sales/credit-notes', [\App\Http\Controllers\Api\SalesController::class, 'creditNotes']);
        Route::get('/sales/barcode/{barcode}', [\App\Http\Controllers\Api\SalesController::class, 'barcodeLookup']);

        // إدارة العملاء وكشوف الحسابات (Customers Master & Account Statements)
        Route::get('/customers', [\App\Http\Controllers\Api\CustomerController::class, 'index']);
        Route::post('/customers', [\App\Http\Controllers\Api\CustomerController::class, 'store'])->middleware('role:company_owner,accountant,sales_rep');
        Route::get('/customers/{id}', [\App\Http\Controllers\Api\CustomerController::class, 'show']);
        Route::put('/customers/{id}', [\App\Http\Controllers\Api\CustomerController::class, 'update'])->middleware('role:company_owner,accountant,sales_rep');
        Route::get('/customers/{id}/statement', [\App\Http\Controllers\Api\CustomerController::class, 'statement']);
        Route::get('/customers/{id}/aging', [\App\Http\Controllers\Api\CustomerController::class, 'aging']);

        // الحسابات العامة وقيود اليومية والتكاليف (Phase 8: Accounting & Costing - Protected by erp.accounting feature)
        Route::middleware(['feature:erp.accounting'])->group(function () {
            Route::get('/accounting/accounts', [\App\Http\Controllers\Api\AccountingController::class, 'accounts']);
            Route::post('/accounting/accounts/init-default', [\App\Http\Controllers\Api\AccountingController::class, 'initDefaultAccounts'])->middleware('role:accountant,company_owner');
            Route::post('/accounting/accounts', [\App\Http\Controllers\Api\AccountingController::class, 'storeAccount'])->middleware('role:accountant,company_owner');
            Route::put('/accounting/accounts/{id}', [\App\Http\Controllers\Api\AccountingController::class, 'updateAccount'])->middleware('role:accountant,company_owner');
            Route::get('/accounting/accounts/{id}/statement', [\App\Http\Controllers\Api\AccountingController::class, 'accountStatement'])->middleware('role:accountant,financial_accountant,company_owner');
            Route::get('/accounting/mappings', [\App\Http\Controllers\Api\AccountingController::class, 'getMappings'])->middleware('role:accountant,company_owner');
            Route::post('/accounting/mappings', [\App\Http\Controllers\Api\AccountingController::class, 'setMapping'])->middleware('role:accountant,company_owner');

            Route::get('/accounting/journal-entries', [\App\Http\Controllers\Api\AccountingController::class, 'journalEntries']);
            Route::post('/accounting/journal-entries', [\App\Http\Controllers\Api\AccountingController::class, 'storeJournalEntry'])->middleware('role:accountant,company_owner');
            Route::post('/accounting/journal-entries/{id}/reverse', [\App\Http\Controllers\Api\AccountingController::class, 'reverseJournalEntry'])->middleware('role:accountant,company_owner');

            Route::get('/accounting/financial-accounts', [\App\Http\Controllers\Api\AccountingController::class, 'financialAccounts']);
            Route::post('/accounting/financial-accounts', [\App\Http\Controllers\Api\AccountingController::class, 'storeFinancialAccount'])->middleware('role:accountant,company_owner');
            Route::get('/accounting/transfers', [\App\Http\Controllers\Api\AccountingController::class, 'transfers']);
            Route::post('/accounting/transfers', [\App\Http\Controllers\Api\AccountingController::class, 'storeTransfer'])->middleware('role:accountant,company_owner');
            Route::post('/accounting/transfers/{id}/reverse', [\App\Http\Controllers\Api\AccountingController::class, 'reverseTransfer'])->middleware('role:accountant,company_owner');

            Route::get('/accounting/cost-centers', [\App\Http\Controllers\Api\AccountingController::class, 'costCenters']);
            Route::post('/accounting/cost-centers', [\App\Http\Controllers\Api\AccountingController::class, 'storeCostCenter'])->middleware('role:accountant,company_owner');
            Route::put('/accounting/cost-centers/{id}', [\App\Http\Controllers\Api\AccountingController::class, 'updateCostCenter'])->middleware('role:accountant,company_owner');
            Route::delete('/accounting/cost-centers/{id}', [\App\Http\Controllers\Api\AccountingController::class, 'deleteCostCenter'])->middleware('role:accountant,company_owner');
            Route::post('/accounting/cost-centers/seed-defaults', [\App\Http\Controllers\Api\AccountingController::class, 'seedDefaultCostCenters'])->middleware('role:accountant,company_owner');
            Route::get('/accounting/cost-centers/{id}/statement', [\App\Http\Controllers\Api\AccountingController::class, 'costCenterStatement'])->middleware('role:accountant,financial_accountant,company_owner');

            Route::get('/accounting/fiscal-years', [\App\Http\Controllers\Api\AccountingController::class, 'fiscalYears']);
            Route::post('/accounting/fiscal-years', [\App\Http\Controllers\Api\AccountingController::class, 'storeFiscalYear'])->middleware('role:accountant,company_owner');
            Route::post('/accounting/fiscal-years/initialize-current', [\App\Http\Controllers\Api\AccountingController::class, 'initializeCurrentFiscalYear'])->middleware('role:accountant,company_owner');
            Route::post('/accounting/fiscal-periods/{id}/close', [\App\Http\Controllers\Api\AccountingController::class, 'closeFiscalPeriod'])->middleware('role:accountant,company_owner');
            Route::post('/accounting/fiscal-periods/{id}/reopen', [\App\Http\Controllers\Api\AccountingController::class, 'reopenFiscalPeriod'])->middleware('role:accountant,company_owner');
            Route::post('/accounting/fiscal-years/{id}/close', [\App\Http\Controllers\Api\AccountingController::class, 'closeFiscalYear'])->middleware('role:accountant,company_owner');

            Route::get('/accounting/reconciliation/ar', [\App\Http\Controllers\Api\AccountingController::class, 'reconcileAR'])->middleware('role:accountant,financial_accountant,company_owner');
            Route::get('/accounting/reconciliation/ap', [\App\Http\Controllers\Api\AccountingController::class, 'reconcileAP'])->middleware('role:accountant,financial_accountant,company_owner');
            Route::get('/accounting/reconciliation/treasury', [\App\Http\Controllers\Api\AccountingController::class, 'reconcileTreasury'])->middleware('role:accountant,financial_accountant,company_owner');
            Route::get('/accounting/reconciliation/inventory', [\App\Http\Controllers\Api\AccountingController::class, 'reconcileInventory'])->middleware('role:accountant,financial_accountant,company_owner');
            Route::post('/accounting/reconciliation/ar/auto-reconcile', [\App\Http\Controllers\Api\AccountingController::class, 'autoReconcileAR'])->middleware('role:accountant,financial_accountant,company_owner');
            Route::post('/accounting/reconciliation/ap/auto-reconcile', [\App\Http\Controllers\Api\AccountingController::class, 'autoReconcileAP'])->middleware('role:accountant,financial_accountant,company_owner');
            Route::post('/accounting/reconciliation/treasury/auto-reconcile', [\App\Http\Controllers\Api\AccountingController::class, 'autoReconcileTreasury'])->middleware('role:accountant,financial_accountant,company_owner');

            Route::get('/accounting/payment-vouchers', [\App\Http\Controllers\Api\AccountingController::class, 'paymentVouchers']);
            Route::post('/accounting/payment-vouchers', [\App\Http\Controllers\Api\AccountingController::class, 'storePaymentVoucher'])->middleware('role:accountant,company_owner');
            Route::get('/accounting/cost-sheets', [\App\Http\Controllers\Api\AccountingController::class, 'costSheets']);
            Route::post('/accounting/cost-sheets/auto-calculate-all', [\App\Http\Controllers\Api\AccountingController::class, 'autoCalculateAllCostSheets'])->middleware('role:accountant,production_manager,company_owner');
            Route::post('/accounting/cost-sheets/{productionOrderId}/calculate', [\App\Http\Controllers\Api\AccountingController::class, 'calculateCost'])->middleware('role:accountant,production_manager,company_owner');
            Route::post('/accounting/cost-sheets/{id}/approve', [\App\Http\Controllers\Api\AccountingController::class, 'approveCostSheet'])->middleware('role:accountant,production_manager,company_owner');

            // التقارير المالية والقوائم الختامية المتقدمة (Phase 08B: Advanced Financial Reporting & Industrial Costing)
            Route::get('/accounting/reports/trial-balance', [\App\Http\Controllers\Api\AccountingController::class, 'trialBalance'])->middleware('role:accountant,financial_accountant,company_owner');
            Route::get('/accounting/reports/income-statement', [\App\Http\Controllers\Api\AccountingController::class, 'incomeStatement'])->middleware('role:accountant,financial_accountant,company_owner');
            Route::get('/accounting/reports/balance-sheet', [\App\Http\Controllers\Api\AccountingController::class, 'balanceSheet'])->middleware('role:accountant,financial_accountant,company_owner');
            Route::get('/accounting/reports/vat-summary', [\App\Http\Controllers\Api\AccountingController::class, 'vatSummary'])->middleware('role:accountant,financial_accountant,company_owner');
            Route::get('/accounting/reports/cost-variance', [\App\Http\Controllers\Api\AccountingController::class, 'costVariance'])->middleware('role:accountant,financial_accountant,company_owner,production_manager');
        });

        // الموارد البشرية وإدارة القوى العاملة ومسيرات الرواتب (Phase C: Workforce & Payroll - Protected by erp.payroll feature)
        Route::middleware(['feature:erp.payroll'])->group(function () {
            Route::get('/hr/employees', [\App\Http\Controllers\Api\HrController::class, 'employees']);
            Route::post('/hr/employees', [\App\Http\Controllers\Api\HrController::class, 'storeEmployee'])->middleware(['role:accountant,production_manager,company_owner', 'quota:active_employees']);
            Route::get('/hr/employees/{id}', [\App\Http\Controllers\Api\HrController::class, 'showEmployee']);
            Route::put('/hr/employees/{id}', [\App\Http\Controllers\Api\HrController::class, 'updateEmployee'])->middleware('role:accountant,production_manager,company_owner');
            Route::delete('/hr/employees/{id}', [\App\Http\Controllers\Api\HrController::class, 'destroyEmployee'])->middleware('role:accountant,production_manager,company_owner');

            // الحضور والانصراف وساعات العمل والورديات
            Route::get('/hr/attendances', [\App\Http\Controllers\Api\HrController::class, 'attendances']);
            Route::post('/hr/attendances', [\App\Http\Controllers\Api\HrController::class, 'storeAttendance'])->middleware('role:accountant,production_manager,company_owner');
            Route::post('/hr/attendances/bulk', [\App\Http\Controllers\Api\HrController::class, 'bulkAttendance'])->middleware('role:accountant,production_manager,company_owner');
            Route::put('/hr/attendances/{id}', [\App\Http\Controllers\Api\HrController::class, 'updateAttendance'])->middleware('role:accountant,production_manager,company_owner');

            // السلف والمكافآت والبدلات والخصومات
            Route::get('/hr/adjustments', [\App\Http\Controllers\Api\HrController::class, 'adjustments']);
            Route::post('/hr/adjustments', [\App\Http\Controllers\Api\HrController::class, 'storeAdjustment'])->middleware('role:accountant,production_manager,company_owner');
            Route::post('/hr/adjustments/{id}/approve', [\App\Http\Controllers\Api\HrController::class, 'approveAdjustment'])->middleware('role:accountant,company_owner');
            Route::post('/hr/adjustments/{id}/reject', [\App\Http\Controllers\Api\HrController::class, 'rejectAdjustment'])->middleware('role:accountant,company_owner');

            // أجور القطعة وسجلات الإنتاج
            Route::get('/hr/piece-rates', [\App\Http\Controllers\Api\HrController::class, 'pieceRates']);
            Route::post('/hr/piece-rates', [\App\Http\Controllers\Api\HrController::class, 'storePieceRate'])->middleware('role:accountant,production_manager');
            Route::get('/hr/piece-work-logs', [\App\Http\Controllers\Api\HrController::class, 'pieceWorkLogs']);
            Route::post('/hr/piece-work-logs', [\App\Http\Controllers\Api\HrController::class, 'storePieceWorkLog']);
            Route::post('/hr/piece-work-logs/{id}/approve', [\App\Http\Controllers\Api\HrController::class, 'approvePieceWorkLog'])->middleware('role:production_manager,accountant,company_owner');
            Route::post('/hr/piece-work-logs/{id}/reject', [\App\Http\Controllers\Api\HrController::class, 'rejectPieceWorkLog'])->middleware('role:production_manager,accountant,company_owner');

            // تسويات عيوب الجودة والخصومات المعتمدة (Phase 09B)
            Route::get('/hr/defect-adjustments', [\App\Http\Controllers\Api\HrController::class, 'defectAdjustments']);
            Route::post('/hr/defect-adjustments', [\App\Http\Controllers\Api\HrController::class, 'storeDefectAdjustment'])->middleware('role:production_manager,quality_controller,accountant,company_owner');
            Route::post('/hr/defect-adjustments/{id}/approve', [\App\Http\Controllers\Api\HrController::class, 'approveDefectAdjustment'])->middleware('role:production_manager,quality_controller,accountant,company_owner');
            Route::post('/hr/defect-adjustments/{id}/reject', [\App\Http\Controllers\Api\HrController::class, 'rejectDefectAdjustment'])->middleware('role:production_manager,quality_controller,accountant,company_owner');
            Route::post('/hr/defect-adjustments/{id}/object', [\App\Http\Controllers\Api\HrController::class, 'recordWorkerObjection']);
            Route::post('/hr/defect-adjustments/{id}/reverse', [\App\Http\Controllers\Api\HrController::class, 'reverseDefectAdjustment']);

            // مسيرات الرواتب ودورة الاعتماد والمدفوعات
            Route::get('/hr/payrolls', [\App\Http\Controllers\Api\HrController::class, 'payrolls']);
            Route::get('/hr/payrolls/{id}', [\App\Http\Controllers\Api\HrController::class, 'showPayroll']);
            Route::get('/hr/payrolls/{id}/items/{itemId}/payslip', [\App\Http\Controllers\Api\HrController::class, 'payslip']);
            Route::post('/hr/payrolls/generate', [\App\Http\Controllers\Api\HrController::class, 'generatePayroll'])->middleware('role:accountant,company_owner');
            Route::post('/hr/payrolls/{id}/recalculate', [\App\Http\Controllers\Api\HrController::class, 'recalculatePayroll'])->middleware('role:accountant,company_owner');
            Route::delete('/hr/payrolls/{id}', [\App\Http\Controllers\Api\HrController::class, 'destroyPayroll'])->middleware('role:accountant,company_owner');
            Route::post('/hr/payrolls/{id}/approve', [\App\Http\Controllers\Api\HrController::class, 'approvePayroll'])->middleware('role:company_owner,accountant');
            Route::post('/hr/payrolls/{id}/reject', [\App\Http\Controllers\Api\HrController::class, 'rejectPayroll'])->middleware('role:company_owner,accountant');
            Route::post('/hr/payrolls/{id}/finalize', [\App\Http\Controllers\Api\HrController::class, 'finalizePayroll'])->middleware('role:company_owner,accountant');
            Route::post('/hr/payrolls/{id}/pay', [\App\Http\Controllers\Api\HrController::class, 'markPayrollPaid'])->middleware('role:accountant,company_owner');
            Route::get('/hr/payrolls/{id}/payments', [\App\Http\Controllers\Api\HrController::class, 'payrollPayments']);
        });

        // إدارة المتجر الإلكتروني داخل الـ ERP (Phase 10: Storefront ERP & Themes - Protected by erp.storefront)
        Route::middleware(['feature:erp.storefront'])->group(function () {
            Route::get('/storefront/settings', [\App\Http\Controllers\Api\StorefrontController::class, 'settings']);
            Route::put('/storefront/settings', [\App\Http\Controllers\Api\StorefrontController::class, 'updateSettings']);
            Route::get('/storefront/design', [\App\Http\Controllers\Api\StorefrontController::class, 'designStudio']);
            Route::post('/storefront/design/draft', [\App\Http\Controllers\Api\StorefrontController::class, 'saveDraft']);
            Route::post('/storefront/design/publish', [\App\Http\Controllers\Api\StorefrontController::class, 'publishDraft'])->middleware('role:company_owner,production_manager');
            Route::post('/storefront/design/rollback', [\App\Http\Controllers\Api\StorefrontController::class, 'rollback'])->middleware('role:company_owner,production_manager');
            Route::post('/storefront/instapay-settings', [\App\Http\Controllers\Api\StorefrontController::class, 'updateInstaPaySettings'])->middleware('role:company_owner,accountant');
            Route::get('/storefront/orders', [\App\Http\Controllers\Api\StorefrontController::class, 'orders']);
            Route::patch('/storefront/orders/{id}/status', [\App\Http\Controllers\Api\StorefrontController::class, 'updateStatus'])->middleware('role:company_owner,production_manager,accountant,sales_manager');
            Route::post('/storefront/orders/{id}/verify-payment', [\App\Http\Controllers\Api\StorefrontController::class, 'verifyPayment'])->middleware('role:company_owner,accountant,financial_accountant,production_manager');
            Route::get('/storefront/payments/pending', [\App\Http\Controllers\Api\StorefrontController::class, 'pendingPayments'])->middleware('role:company_owner,accountant,financial_accountant,production_manager');
            Route::post('/storefront/payments/{id}/approve', [\App\Http\Controllers\Api\StorefrontController::class, 'verifyPayment'])->middleware('role:company_owner,accountant,financial_accountant,production_manager');
            Route::post('/storefront/payments/{id}/reject', [\App\Http\Controllers\Api\StorefrontController::class, 'verifyPayment'])->middleware('role:company_owner,accountant,financial_accountant,production_manager');
            Route::get('/storefront/payments/{id}/receipt', [\App\Http\Controllers\Api\StorefrontController::class, 'viewReceiptFile'])->middleware('role:company_owner,accountant,financial_accountant,production_manager');
        });

        // إدارة الماكينات وصيانة الأصول وبلاغات الأعطال (Phase 12: Machine & Asset Maintenance)
        Route::get('/maintenance/machines', [\App\Http\Controllers\Api\MaintenanceController::class, 'indexMachines']);
        Route::post('/maintenance/machines', [\App\Http\Controllers\Api\MaintenanceController::class, 'storeMachine'])->middleware('role:production_manager,accountant');
        Route::put('/maintenance/machines/{id}', [\App\Http\Controllers\Api\MaintenanceController::class, 'updateMachine'])->middleware('role:production_manager,accountant');
        Route::get('/maintenance/work-orders', [\App\Http\Controllers\Api\MaintenanceController::class, 'indexWorkOrders']);
        Route::post('/maintenance/work-orders', [\App\Http\Controllers\Api\MaintenanceController::class, 'storeWorkOrder'])->middleware('role:production_manager,accountant');
        Route::post('/maintenance/work-orders/{id}/spare-parts', [\App\Http\Controllers\Api\MaintenanceController::class, 'addSparePart'])->middleware('role:production_manager,accountant');
        Route::post('/maintenance/work-orders/{id}/complete', [\App\Http\Controllers\Api\MaintenanceController::class, 'completeWorkOrder'])->middleware('role:production_manager,accountant');
        Route::get('/maintenance/spare-parts/stock', [\App\Http\Controllers\Api\MaintenanceController::class, 'indexSparePartsStock']);
        Route::post('/maintenance/spare-parts/stock', [\App\Http\Controllers\Api\MaintenanceController::class, 'storeSparePartStock'])->middleware('role:production_manager,accountant');
        Route::get('/maintenance/downtime-summary', [\App\Http\Controllers\Api\MaintenanceController::class, 'downtimeSummary']);

        // إدارة الاشتراكات والحصص والفوترة (Commercial SaaS Subscription Plans & Usage Metering)
        Route::get('/subscription/current', [\App\Http\Controllers\Api\SubscriptionController::class, 'current']);
        Route::get('/subscription/overrides', [\App\Http\Controllers\Api\SubscriptionController::class, 'activeOverrides']);
        Route::post('/subscription/upgrade', [\App\Http\Controllers\Api\SubscriptionController::class, 'upgrade'])->middleware('role:company_owner');
        Route::get('/admin/subscriptions', [\App\Http\Controllers\Api\SubscriptionController::class, 'adminList'])->middleware('role:platform_admin,company_owner');
        Route::post('/admin/subscriptions/override', [\App\Http\Controllers\Api\SubscriptionController::class, 'grantOverride'])->middleware('role:platform_admin,company_owner');

        // منصة وصلة ورش الصناعية للتشغيل وسوق المشاغل (Phase G: Waslat Worsh B2B Marketplace - Enterprise Exclusive)
        Route::get('/waslat-worsh/eligibility', [\App\Http\Controllers\Api\WaslatWorshController::class, 'eligibility']);

        Route::middleware(['marketplace.entitled:read_or_history'])->group(function () {
            Route::get('/waslat-worsh/workshops', [\App\Http\Controllers\Api\WaslatWorshController::class, 'workshops']);
            Route::get('/waslat-worsh/rfqs', [\App\Http\Controllers\Api\WaslatWorshController::class, 'rfqs']);
            Route::get('/waslat-worsh/rfqs/{id}', [\App\Http\Controllers\Api\WaslatWorshController::class, 'showRfq']);
            Route::get('/waslat-worsh/rfqs/{id}/attachments/{attachmentId}', [\App\Http\Controllers\Api\WaslatWorshController::class, 'downloadAttachment']);
        });

        Route::middleware(['marketplace.entitled:write'])->group(function () {
            Route::post('/waslat-worsh/rfqs', [\App\Http\Controllers\Api\WaslatWorshController::class, 'storeRfq'])->middleware('throttle:marketplace-rfq');
            Route::put('/waslat-worsh/rfqs/{id}', [\App\Http\Controllers\Api\WaslatWorshController::class, 'updateRfq']);
            Route::post('/waslat-worsh/rfqs/{id}/publish', [\App\Http\Controllers\Api\WaslatWorshController::class, 'publishRfq']);
            Route::post('/waslat-worsh/rfqs/{id}/cancel', [\App\Http\Controllers\Api\WaslatWorshController::class, 'cancelRfq']);
            Route::post('/waslat-worsh/rfqs/{id}/attachments', [\App\Http\Controllers\Api\WaslatWorshController::class, 'uploadAttachment']);
            Route::delete('/waslat-worsh/rfqs/{id}/attachments/{attachmentId}', [\App\Http\Controllers\Api\WaslatWorshController::class, 'deleteAttachment']);
            Route::post('/waslat-worsh/rfqs/{id}/bids/{bidId}/accept', [\App\Http\Controllers\Api\WaslatWorshController::class, 'acceptBid']);
            Route::patch('/waslat-worsh/rfqs/{id}/operation-status', [\App\Http\Controllers\Api\WaslatWorshController::class, 'updateOperationStatus']);
            Route::post('/waslat-worsh/reviews', [\App\Http\Controllers\Api\WaslatWorshController::class, 'storeReview']);
        });

        // مسارات مزودي الخدمة والمشاغل (Stage C.6 & P4: Enterprise Provider Operations)
        Route::middleware(['marketplace.entitled:provider'])->group(function () {
            Route::post('/waslat-worsh/workshops', [\App\Http\Controllers\Api\WaslatWorshController::class, 'storeWorkshop']);
            Route::post('/waslat-worsh/rfqs/{id}/bids', [\App\Http\Controllers\Api\WaslatWorshController::class, 'submitBid'])->middleware(['throttle:marketplace-rfq', 'quota:marketplace_bids']);
            Route::get('/waslat-worsh/my-bids', [\App\Http\Controllers\Api\WaslatWorshController::class, 'myBids']);
            Route::post('/waslat-worsh/bids/{id}/withdraw', [\App\Http\Controllers\Api\WaslatWorshController::class, 'withdrawBid']);
            Route::get('/waslat-worsh/my-operations', [\App\Http\Controllers\Api\WaslatWorshController::class, 'myOperations']);
        });
    });

    // قائمة باقات الاشتراك العامة
    Route::get('/subscription/plans', [\App\Http\Controllers\Api\SubscriptionController::class, 'plans']);
    Route::get('/subscription/public-plans', [\App\Http\Controllers\Api\SaasPackageManagementController::class, 'publicPlans']);
    Route::get('/waslat-worsh/subscription-plans', [\App\Http\Controllers\Api\SubscriptionPaymentRequestController::class, 'waslatWorshPlans']);

    // واجهة المتجر الإلكتروني العامة وتتبع الطلبات (Phase 10 & Phase A: Public Storefront & Tracking)
    Route::middleware('throttle:public-storefront')->group(function () {
        Route::get('/storefront/public/{tenantId?}', [\App\Http\Controllers\Api\StorefrontController::class, 'publicStore']);
        Route::post('/storefront/order/{tenantId?}', [\App\Http\Controllers\Api\StorefrontController::class, 'placeOrder']);
        Route::get('/storefront/track/{tenantId?}', [\App\Http\Controllers\Api\StorefrontController::class, 'trackOrder']);
        Route::post('/storefront/receipt/{tenantId?}', [\App\Http\Controllers\Api\StorefrontController::class, 'submitReceipt']);
        Route::post('/storefront/upload-receipt/{tenantId?}', [\App\Http\Controllers\Api\StorefrontController::class, 'uploadReceipt']);

        // واجهة سوق وصلة ورش العامة لزوار الموقع والمؤشرات الحية (Stage C.1: Public Waslat Worsh Marketplace)
        Route::get('/waslat-worsh/public/rfqs', [\App\Http\Controllers\Api\WaslatWorshPublicController::class, 'index']);
        Route::get('/waslat-worsh/public/rfqs/{id}', [\App\Http\Controllers\Api\WaslatWorshPublicController::class, 'show']);
        Route::get('/waslat-worsh/public/metrics', [\App\Http\Controllers\Api\WaslatWorshPublicController::class, 'metrics']);
    });
});


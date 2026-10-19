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
    // فحص صحة النظام وتكوين المنصة
    Route::get('/health', function () {
        return response()->json([
            'status' => 'healthy',
            'platform' => 'GarmentOS Cloud',
            'version' => '1.0.0',
            'php_version' => PHP_VERSION,
            'timestamp' => now()->toIso8601String(),
        ]);
    });

    // المصادقة والتسجيل مع الحماية من الهجمات بالتخمين (Rate Limiting)
    Route::post('/auth/register-company', [TenantController::class, 'register'])->middleware('throttle:10,1');
    Route::post('/auth/login', [TenantController::class, 'login'])->middleware('throttle:10,1');
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

    // استلام إشعارات الدفع الموقعة من بوابات الدفع الإلكتروني (Verified Webhook)
    Route::post('/subscriptions/webhook/stripe', [\App\Http\Controllers\Api\SubscriptionWebhookController::class, 'handleWebhook'])->defaults('provider', 'stripe');
    Route::post('/subscriptions/webhook/paymob', [\App\Http\Controllers\Api\SubscriptionWebhookController::class, 'handleWebhook'])->defaults('provider', 'paymob');
    Route::post('/webhooks/subscription-payment', [\App\Http\Controllers\Api\SubscriptionWebhookController::class, 'handleWebhook']);
    Route::post('/subscriptions/webhook', [\App\Http\Controllers\Api\SubscriptionWebhookController::class, 'handleWebhook']);

    // مسارات إدارة المنصة العليا (Platform Administration) - مسار تفويض مخصص بدون سياق شركة مستأجرة
    Route::middleware(['auth:sanctum', \App\Http\Middleware\EnsurePlatformAdmin::class])->group(function () {
        Route::get('/platform-admin/overview', [\App\Http\Controllers\Api\PlatformAdminController::class, 'overview']);
        Route::get('/platform-admin/tenants', [\App\Http\Controllers\Api\PlatformAdminController::class, 'tenants']);
        Route::get('/platform-admin/tenants/{id}', [\App\Http\Controllers\Api\PlatformAdminController::class, 'showTenant']);
        Route::post('/platform-admin/tenants/{id}/suspend', [\App\Http\Controllers\Api\PlatformAdminController::class, 'suspendTenant']);
        Route::get('/platform-admin/audit-logs', [\App\Http\Controllers\Api\PlatformAdminController::class, 'auditLogs']);
        Route::post('/platform-admin/tenants/{id}/activate-subscription', [\App\Http\Controllers\Api\PlatformAdminController::class, 'activateSubscription']);
        Route::post('/platform-admin/tenants/{id}/subscription/manual-activate', [\App\Http\Controllers\Api\PlatformAdminController::class, 'activateSubscription']);
        Route::post('/admin/tenants/{id}/activate-subscription', [\App\Http\Controllers\Api\PlatformAdminController::class, 'activateSubscription']);
    });

    // المسارات المحمية بعزل الشركات
    Route::middleware(['auth:sanctum', IdentifyTenant::class])->group(function () {
        Route::get('/tenant/profile', [TenantController::class, 'current']);
        Route::post('/tenant/subscription/activate', [TenantController::class, 'activateSubscription']);

        // الفروع ومواقع العمل
        Route::get('/branches', [BranchController::class, 'index']);
        Route::post('/branches', [BranchController::class, 'store']);
        Route::get('/branches/{id}', [BranchController::class, 'show']);

        // كتالوج موديلات الملابس والمتغيرات
        Route::get('/models', [\App\Http\Controllers\Api\GarmentModelController::class, 'index']);
        Route::post('/models', [\App\Http\Controllers\Api\GarmentModelController::class, 'store']);
        Route::get('/models/{id}', [\App\Http\Controllers\Api\GarmentModelController::class, 'show']);
        Route::get('/sizes', [\App\Http\Controllers\Api\GarmentModelController::class, 'sizes']);
        Route::get('/colors', [\App\Http\Controllers\Api\GarmentModelController::class, 'colors']);

        // المخازن ودفتر الأستاذ المخزني وأمانات العملاء
        Route::get('/warehouses', [\App\Http\Controllers\Api\InventoryController::class, 'warehouses']);
        Route::get('/inventory/items', [\App\Http\Controllers\Api\InventoryController::class, 'items']);
        Route::post('/inventory/transactions', [\App\Http\Controllers\Api\InventoryController::class, 'recordTransaction']);
        Route::get('/inventory/transactions', [\App\Http\Controllers\Api\InventoryController::class, 'transactions']);
        Route::post('/inventory/convert-fabric', [\App\Http\Controllers\Api\InventoryController::class, 'convertFabric']);
        Route::get('/inventory/customer-materials', [\App\Http\Controllers\Api\InventoryController::class, 'customerMaterials']);
        Route::post('/inventory/customer-materials', [\App\Http\Controllers\Api\InventoryController::class, 'receiveCustomerMaterial']);
        Route::post('/inventory/customer-materials/{id}/consume', [\App\Http\Controllers\Api\InventoryController::class, 'consumeCustomerMaterial']);

        // المشتريات والموردين وفحص الاستلام والفواتير
        Route::get('/suppliers', [\App\Http\Controllers\Api\SupplierController::class, 'index']);
        Route::post('/suppliers', [\App\Http\Controllers\Api\SupplierController::class, 'store']);
        Route::get('/suppliers/{id}', [\App\Http\Controllers\Api\SupplierController::class, 'show']);

        Route::get('/purchase-orders', [\App\Http\Controllers\Api\PurchaseOrderController::class, 'index']);
        Route::post('/purchase-orders', [\App\Http\Controllers\Api\PurchaseOrderController::class, 'store'])->middleware('role:accountant,production_manager');
        Route::get('/purchase-orders/{id}', [\App\Http\Controllers\Api\PurchaseOrderController::class, 'show']);
        Route::post('/purchase-orders/{id}/approve', [\App\Http\Controllers\Api\PurchaseOrderController::class, 'approve'])->middleware('role:accountant');

        Route::get('/goods-receipts', [\App\Http\Controllers\Api\GoodsReceiptController::class, 'index']);
        Route::post('/goods-receipts', [\App\Http\Controllers\Api\GoodsReceiptController::class, 'store'])->middleware('role:production_manager,accountant');
        Route::get('/goods-receipts/{id}', [\App\Http\Controllers\Api\GoodsReceiptController::class, 'show']);

        Route::get('/supplier-invoices', [\App\Http\Controllers\Api\SupplierInvoiceController::class, 'index']);
        Route::post('/supplier-invoices', [\App\Http\Controllers\Api\SupplierInvoiceController::class, 'store'])->middleware('role:accountant');

        // تخطيط وتشغيل الإنتاج والـ BOM وصالة القص وبطاقات الحزم والجودة
        Route::get('/boms', [\App\Http\Controllers\Api\BillOfMaterialController::class, 'index']);
        Route::post('/boms', [\App\Http\Controllers\Api\BillOfMaterialController::class, 'store'])->middleware('role:production_manager');
        Route::post('/boms/{id}/approve', [\App\Http\Controllers\Api\BillOfMaterialController::class, 'approve'])->middleware('role:production_manager');

        Route::get('/production-orders', [\App\Http\Controllers\Api\ProductionOrderController::class, 'index']);
        Route::post('/production-orders', [\App\Http\Controllers\Api\ProductionOrderController::class, 'store'])->middleware('role:production_manager');
        Route::get('/production-orders/{id}', [\App\Http\Controllers\Api\ProductionOrderController::class, 'show']);
        Route::post('/production-orders/{id}/approve', [\App\Http\Controllers\Api\ProductionOrderController::class, 'approve'])->middleware('role:production_manager');
        Route::get('/production-orders/{id}/metrics', [\App\Http\Controllers\Api\ProductionOrderController::class, 'metrics']);

        Route::get('/cutting-orders', [\App\Http\Controllers\Api\CuttingOrderController::class, 'index']);
        Route::post('/cutting-orders', [\App\Http\Controllers\Api\CuttingOrderController::class, 'store'])->middleware('role:production_manager');
        Route::get('/cutting-orders/{id}', [\App\Http\Controllers\Api\CuttingOrderController::class, 'show']);

        Route::get('/bundles', [\App\Http\Controllers\Api\BundleController::class, 'index']);
        Route::post('/bundles/{id}/transfer', [\App\Http\Controllers\Api\BundleController::class, 'transfer']);

        Route::get('/quality-inspections', [\App\Http\Controllers\Api\QualityInspectionController::class, 'index']);
        Route::post('/quality-inspections', [\App\Http\Controllers\Api\QualityInspectionController::class, 'store'])->middleware('role:production_manager');

        // خدمات القص والتصنيع للغير (Phase 6: Subcontracting & CMT Services)
        Route::get('/subcontracting/customers', [\App\Http\Controllers\Api\SubcontractingController::class, 'customers']);
        Route::post('/subcontracting/customers', [\App\Http\Controllers\Api\SubcontractingController::class, 'storeCustomer']);

        Route::get('/subcontracting/jobs', [\App\Http\Controllers\Api\SubcontractingController::class, 'jobs']);
        Route::post('/subcontracting/jobs', [\App\Http\Controllers\Api\SubcontractingController::class, 'storeJob'])->middleware('role:production_manager,accountant');
        Route::get('/subcontracting/jobs/{id}', [\App\Http\Controllers\Api\SubcontractingController::class, 'showJob']);
        Route::post('/subcontracting/jobs/{id}/confirm', [\App\Http\Controllers\Api\SubcontractingController::class, 'confirmJob'])->middleware('role:production_manager,accountant');
        Route::get('/subcontracting/jobs/{id}/profitability', [\App\Http\Controllers\Api\SubcontractingController::class, 'profitability']);

        Route::get('/subcontracting/material-receipts', [\App\Http\Controllers\Api\SubcontractingController::class, 'materialReceipts']);
        Route::post('/subcontracting/material-receipts', [\App\Http\Controllers\Api\SubcontractingController::class, 'storeMaterialReceipt']);

        Route::get('/subcontracting/external-operations', [\App\Http\Controllers\Api\SubcontractingController::class, 'externalOperations']);
        Route::post('/subcontracting/external-operations', [\App\Http\Controllers\Api\SubcontractingController::class, 'dispatchExternalOperation']);
        Route::post('/subcontracting/external-operations/{id}/receive', [\App\Http\Controllers\Api\SubcontractingController::class, 'receiveExternalOperation']);

        Route::get('/subcontracting/delivery-notes', [\App\Http\Controllers\Api\SubcontractingController::class, 'deliveryNotes']);
        Route::post('/subcontracting/delivery-notes', [\App\Http\Controllers\Api\SubcontractingController::class, 'storeDeliveryNote']);

        Route::get('/subcontracting/invoices', [\App\Http\Controllers\Api\SubcontractingController::class, 'invoices']);
        Route::post('/subcontracting/invoices', [\App\Http\Controllers\Api\SubcontractingController::class, 'storeInvoice'])->middleware('role:accountant');
        Route::post('/subcontracting/invoices/{id}/pay', [\App\Http\Controllers\Api\SubcontractingController::class, 'recordPayment'])->middleware('role:accountant');

        // المبيعات ونقاط البيع وحجز المخزون (Phase 7: Sales & POS)
        Route::get('/sales/quotations', [\App\Http\Controllers\Api\SalesController::class, 'quotations']);
        Route::post('/sales/quotations', [\App\Http\Controllers\Api\SalesController::class, 'storeQuotation']);
        Route::get('/sales/orders', [\App\Http\Controllers\Api\SalesController::class, 'salesOrders']);
        Route::post('/sales/orders', [\App\Http\Controllers\Api\SalesController::class, 'storeSalesOrder']);
        Route::post('/sales/orders/{id}/reserve', [\App\Http\Controllers\Api\SalesController::class, 'reserveOrderStock']);
        Route::post('/sales/orders/{id}/fulfill', [\App\Http\Controllers\Api\SalesController::class, 'fulfillOrder']);
        Route::get('/sales/invoices', [\App\Http\Controllers\Api\SalesController::class, 'invoices']);
        Route::post('/pos/sale', [\App\Http\Controllers\Api\SalesController::class, 'posSale']);
        Route::get('/pos/sessions', [\App\Http\Controllers\Api\SalesController::class, 'posSessions']);
        Route::post('/pos/sessions/open', [\App\Http\Controllers\Api\SalesController::class, 'openPosSession']);
        Route::post('/pos/sessions/{id}/close', [\App\Http\Controllers\Api\SalesController::class, 'closePosSession']);
        Route::get('/sales/delivery-notes', [\App\Http\Controllers\Api\SalesController::class, 'deliveryNotes']);
        Route::post('/sales/delivery-notes', [\App\Http\Controllers\Api\SalesController::class, 'storeDeliveryNote']);
        Route::get('/sales/returns', [\App\Http\Controllers\Api\SalesController::class, 'salesReturns']);
        Route::post('/sales/returns', [\App\Http\Controllers\Api\SalesController::class, 'storeSalesReturn']);

        // الحسابات العامة وقيود اليومية والتكاليف (Phase 8: Accounting & Costing)
        Route::get('/accounting/accounts', [\App\Http\Controllers\Api\AccountingController::class, 'accounts']);
        Route::post('/accounting/accounts', [\App\Http\Controllers\Api\AccountingController::class, 'storeAccount'])->middleware('role:accountant');
        Route::get('/accounting/journal-entries', [\App\Http\Controllers\Api\AccountingController::class, 'journalEntries']);
        Route::post('/accounting/journal-entries', [\App\Http\Controllers\Api\AccountingController::class, 'storeJournalEntry'])->middleware('role:accountant');
        Route::get('/accounting/payment-vouchers', [\App\Http\Controllers\Api\AccountingController::class, 'paymentVouchers']);
        Route::post('/accounting/payment-vouchers', [\App\Http\Controllers\Api\AccountingController::class, 'storePaymentVoucher'])->middleware('role:accountant');
        Route::get('/accounting/cost-sheets', [\App\Http\Controllers\Api\AccountingController::class, 'costSheets']);
        Route::post('/accounting/cost-sheets/{productionOrderId}/calculate', [\App\Http\Controllers\Api\AccountingController::class, 'calculateCost'])->middleware('role:accountant,production_manager');

        // الموارد البشرية وأجور القطعة ومسيرات الرواتب (Phase 9: HR & Piece-Rate Payroll)
        Route::get('/hr/employees', [\App\Http\Controllers\Api\HrController::class, 'employees']);
        Route::post('/hr/employees', [\App\Http\Controllers\Api\HrController::class, 'storeEmployee'])->middleware('role:accountant,production_manager');
        Route::get('/hr/piece-rates', [\App\Http\Controllers\Api\HrController::class, 'pieceRates']);
        Route::post('/hr/piece-rates', [\App\Http\Controllers\Api\HrController::class, 'storePieceRate'])->middleware('role:accountant,production_manager');
        Route::get('/hr/piece-work-logs', [\App\Http\Controllers\Api\HrController::class, 'pieceWorkLogs']);
        Route::post('/hr/piece-work-logs', [\App\Http\Controllers\Api\HrController::class, 'storePieceWorkLog']);
        Route::get('/hr/payrolls', [\App\Http\Controllers\Api\HrController::class, 'payrolls']);
        Route::post('/hr/payrolls/generate', [\App\Http\Controllers\Api\HrController::class, 'generatePayroll'])->middleware('role:accountant');

        // إدارة المتجر الإلكتروني داخل الـ ERP (Phase 11: Storefront ERP)
        Route::get('/storefront/orders', [\App\Http\Controllers\Api\StorefrontController::class, 'orders']);

        // إدارة الماكينات وصيانة الأصول وبلاغات الأعطال (Phase 12: Machine & Asset Maintenance)
        Route::get('/maintenance/machines', [\App\Http\Controllers\Api\MaintenanceController::class, 'indexMachines']);
        Route::post('/maintenance/machines', [\App\Http\Controllers\Api\MaintenanceController::class, 'storeMachine']);
        Route::put('/maintenance/machines/{id}', [\App\Http\Controllers\Api\MaintenanceController::class, 'updateMachine']);
        Route::get('/maintenance/work-orders', [\App\Http\Controllers\Api\MaintenanceController::class, 'indexWorkOrders']);
        Route::post('/maintenance/work-orders', [\App\Http\Controllers\Api\MaintenanceController::class, 'storeWorkOrder']);
        Route::post('/maintenance/work-orders/{id}/spare-parts', [\App\Http\Controllers\Api\MaintenanceController::class, 'addSparePart']);
        Route::post('/maintenance/work-orders/{id}/complete', [\App\Http\Controllers\Api\MaintenanceController::class, 'completeWorkOrder']);
        Route::get('/maintenance/downtime-summary', [\App\Http\Controllers\Api\MaintenanceController::class, 'downtimeSummary']);
    });

    // واجهة المتجر الإلكتروني العامة (Phase 10: Public E-Commerce Storefront)
    Route::get('/storefront/public/{tenantId?}', [\App\Http\Controllers\Api\StorefrontController::class, 'publicStore']);
    Route::post('/storefront/order/{tenantId?}', [\App\Http\Controllers\Api\StorefrontController::class, 'placeOrder']);
});


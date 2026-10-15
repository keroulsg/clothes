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

    // استلام إشعارات الدفع الموقعة من بوابات الدفع الإلكتروني (Verified Webhook)
    Route::post('/webhooks/subscription-payment', [\App\Http\Controllers\Api\SubscriptionWebhookController::class, 'handleWebhook']);
    Route::post('/subscriptions/webhook', [\App\Http\Controllers\Api\SubscriptionWebhookController::class, 'handleWebhook']);

    // المسارات المحمية بعزل الشركات
    Route::middleware(['auth:sanctum', IdentifyTenant::class])->group(function () {
        Route::get('/tenant/profile', [TenantController::class, 'current']);
        Route::post('/tenant/subscription/activate', [TenantController::class, 'activateSubscription']);
        Route::post('/platform-admin/tenants/{id}/subscription/manual-activate', [TenantController::class, 'adminManualActivate']);
        Route::post('/admin/tenants/{id}/activate-subscription', [TenantController::class, 'adminManualActivate']);

        // الفروع ومواقع العمل
        Route::get('/branches', [BranchController::class, 'index']);
        Route::post('/branches', [BranchController::class, 'store']);
        Route::get('/branches/{id}', [BranchController::class, 'show']);

        // كتالوج موديلات الملابس والمتغيرات
        Route::get('/models', [\App\Http\Controllers\Api\GarmentModelController::class, 'index']);
        Route::post('/models', [\App\Http\Controllers\Api\GarmentModelController::class, 'store']);
        Route::get('/models/{id}', [\App\Http\Controllers\Api\GarmentModelController::class, 'show']);

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
        Route::post('/purchase-orders', [\App\Http\Controllers\Api\PurchaseOrderController::class, 'store']);
        Route::get('/purchase-orders/{id}', [\App\Http\Controllers\Api\PurchaseOrderController::class, 'show']);
        Route::post('/purchase-orders/{id}/approve', [\App\Http\Controllers\Api\PurchaseOrderController::class, 'approve']);

        Route::get('/goods-receipts', [\App\Http\Controllers\Api\GoodsReceiptController::class, 'index']);
        Route::post('/goods-receipts', [\App\Http\Controllers\Api\GoodsReceiptController::class, 'store']);
        Route::get('/goods-receipts/{id}', [\App\Http\Controllers\Api\GoodsReceiptController::class, 'show']);

        Route::get('/supplier-invoices', [\App\Http\Controllers\Api\SupplierInvoiceController::class, 'index']);
        Route::post('/supplier-invoices', [\App\Http\Controllers\Api\SupplierInvoiceController::class, 'store']);

        // تخطيط وتشغيل الإنتاج والـ BOM وصالة القص وبطاقات الحزم والجودة
        Route::get('/boms', [\App\Http\Controllers\Api\BillOfMaterialController::class, 'index']);
        Route::post('/boms', [\App\Http\Controllers\Api\BillOfMaterialController::class, 'store']);
        Route::post('/boms/{id}/approve', [\App\Http\Controllers\Api\BillOfMaterialController::class, 'approve']);

        Route::get('/production-orders', [\App\Http\Controllers\Api\ProductionOrderController::class, 'index']);
        Route::post('/production-orders', [\App\Http\Controllers\Api\ProductionOrderController::class, 'store']);
        Route::get('/production-orders/{id}', [\App\Http\Controllers\Api\ProductionOrderController::class, 'show']);
        Route::post('/production-orders/{id}/approve', [\App\Http\Controllers\Api\ProductionOrderController::class, 'approve']);
        Route::get('/production-orders/{id}/metrics', [\App\Http\Controllers\Api\ProductionOrderController::class, 'metrics']);

        Route::get('/cutting-orders', [\App\Http\Controllers\Api\CuttingOrderController::class, 'index']);
        Route::post('/cutting-orders', [\App\Http\Controllers\Api\CuttingOrderController::class, 'store']);
        Route::get('/cutting-orders/{id}', [\App\Http\Controllers\Api\CuttingOrderController::class, 'show']);

        Route::get('/bundles', [\App\Http\Controllers\Api\BundleController::class, 'index']);
        Route::post('/bundles/{id}/transfer', [\App\Http\Controllers\Api\BundleController::class, 'transfer']);

        Route::get('/quality-inspections', [\App\Http\Controllers\Api\QualityInspectionController::class, 'index']);
        Route::post('/quality-inspections', [\App\Http\Controllers\Api\QualityInspectionController::class, 'store']);
    });
});

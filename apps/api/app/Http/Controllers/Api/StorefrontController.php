<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentSubmission;
use App\Models\StoreOrder;
use App\Services\DomainResolutionService;
use App\Services\StorefrontService;
use App\Services\SalesService;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class StorefrontController extends Controller
{
    public function __construct(
        protected StorefrontService $storefrontService,
        protected DomainResolutionService $domainResolver,
        protected SalesService $salesService
    ) {}

    /**
     * واجهة المتجر العامة للمستهلكين والزوار
     * يتم تحديد المستأجر حتمياً عبر اسم النطاق/المضيف أو المعرف المعتمد بدون أي Fallback عشوائي
     */
    public function publicStore(Request $request, ?string $tenantId = null): JsonResponse
    {
        $tenant = $this->domainResolver->resolveStorefrontTenant($request, $tenantId);

        if (!$tenant) {
            return response()->json([
                'error' => 'StorefrontNotFound',
                'message' => 'المتجر الإلكتروني المطلوب غير موجود أو لم يتم التحقق من نطاقه.',
            ], 404);
        }

        if (in_array($tenant->status, ['suspended', 'cancelled'], true)) {
            return response()->json([
                'error' => 'StorefrontSuspended',
                'message' => 'المتجر الإلكتروني موقوف حالياً. يرجى التواصل مع إدارة المتجر.',
            ], 403);
        }

        app()->instance('current_tenant_id', $tenant->id);

        $preview = $request->boolean('preview') || $request->query('preview') === '1';
        $details = $this->storefrontService->getStoreDetails($tenant->id, $preview);

        if (isset($details['store_settings']) && !$details['store_settings']->is_store_enabled) {
            return response()->json([
                'error' => 'StorefrontDisabled',
                'message' => 'المتجر الإلكتروني غير متاح للجمهور حالياً.',
            ], 404);
        }

        // إضافة بيانات النطاق العام للواجهة
        $details['tenant'] = [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'code' => $tenant->code,
            'subdomain' => $tenant->subdomain,
            'custom_domain' => $tenant->custom_domain,
            'currency' => $tenant->currency,
        ];

        return response()->json($details);
    }

    /**
     * تسجيل طلب شراء من المتجر الإلكتروني مع دعم COD و InstaPay والخصم المباشر من المخزون
     */
    public function placeOrder(Request $request, ?string $tenantId = null): JsonResponse
    {
        $tenant = $this->domainResolver->resolveStorefrontTenant($request, $tenantId);

        if (!$tenant) {
            return response()->json([
                'error' => 'StorefrontNotFound',
                'message' => 'لا يمكن إتمام الطلب: المتجر الإلكتروني غير موجود أو لم يتم التعرف على نطاقه.',
            ], 404);
        }

        if (in_array($tenant->status, ['suspended', 'cancelled'], true)) {
            return response()->json([
                'error' => 'StorefrontSuspended',
                'message' => 'لا يمكن تسجيل طلبات شراء حالياً: حساب هذا المتجر موقوف.',
            ], 403);
        }

        app()->instance('current_tenant_id', $tenant->id);

        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'required|string|max:50',
            'shipping_address' => 'required|string',
            'city' => 'nullable|string|max:100',
            'payment_method' => 'required|string|in:cod,instapay',
            'instapay_reference' => 'nullable|string|max:100',
            'instapay_receipt_url' => 'nullable|string',
            'shipping_fee' => 'nullable|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.variant_id' => 'required|uuid',
            'items.*.product_name' => 'nullable|string',
            'items.*.sku' => 'nullable|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'nullable|numeric|min:0',
        ]);

        try {
            $order = $this->storefrontService->placeStoreOrder($tenant->id, $validated);

            return response()->json([
                'message' => 'تم استلام طلب الشراء بنجاح وسيتواصل معكم فريق المتجر للتأكيد والشحن',
                'order' => $order,
            ], 201);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'error' => 'InvalidStoreOrder',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * استعراض وتعديل إعدادات وهوية وثيم المتجر للشركة داخل الـ ERP
     */
    public function settings(): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $details = $this->storefrontService->getStoreDetails($tenantId);

        return response()->json($details);
    }

    /**
     * تحديث إعدادات وهوية المتجر
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $validated = $request->validate([
            'store_name' => 'nullable|string|max:255',
            'theme_id' => 'nullable|string|in:fashion_boutique,modern_catalog,kids_family,premium_brand,modern_fashion,kids_baby,wholesale_uniform',
            'theme_config' => 'nullable|array',
            'is_store_enabled' => 'nullable|boolean',
            'allow_cod' => 'nullable|boolean',
            'allow_card_payment' => 'nullable|boolean',
            'allow_instapay' => 'nullable|boolean',
            'instapay_account_name' => 'nullable|string|max:255',
            'instapay_handle' => 'nullable|string|max:100',
            'instapay_instructions' => 'nullable|string',
            'currency' => 'nullable|string|max:10',
            'direction' => 'nullable|string|in:rtl,ltr',
            'banner_title' => 'nullable|string|max:255',
            'banner_subtitle' => 'nullable|string',
            'contact_whatsapp' => 'nullable|string|max:50',
        ]);

        try {
            $updated = $this->storefrontService->updateStoreSettings($tenantId, $validated);

            return response()->json([
                'message' => 'تم حفظ إعدادات وهوية وثيم المتجر الإلكتروني بنجاح',
                'store_settings' => $updated,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'error' => 'InvalidSettings',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * تكوين استوديو التصميم (القوالب، المسودة الحالية، والإعدادات المنشورة)
     */
    public function designStudio(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $data = $this->storefrontService->getDesignStudioConfig($tenantId);

        return response()->json($data);
    }

    /**
     * حفظ مسودة تعديلات التصميم (بدون التأثير على المتجر المنشور)
     */
    public function saveDraft(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $validated = $request->validate([
            'theme_id' => 'nullable|string|in:fashion_boutique,modern_catalog,kids_family,premium_brand,modern_fashion,kids_baby,wholesale_uniform',
            'theme_config' => 'nullable|array',
        ]);

        try {
            $updated = $this->storefrontService->saveDesignDraft($tenantId, $validated);

            return response()->json([
                'message' => 'تم حفظ مسودة التصميم بنجاح.',
                'store_settings' => $updated,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'error' => 'InvalidTheme',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * نشر تعديلات المسودة ذرياً للمتجر الحي مع أرشفة النسخة السابقة
     */
    public function publishDraft(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $updated = $this->storefrontService->publishDesign($tenantId, $request->user()?->id);

        return response()->json([
            'message' => 'تم نشر التعديلات بنجاح إلى المتجر الإلكتروني الحي.',
            'store_settings' => $updated,
        ]);
    }

    /**
     * استرجاع النسخة المنشورة السابقة
     */
    public function rollback(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        try {
            $updated = $this->storefrontService->rollbackDesign($tenantId);

            return response()->json([
                'message' => 'تم استرجاع النسخة المنشورة السابقة بنجاح.',
                'store_settings' => $updated,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'error' => 'CannotRollback',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * استعراض الطلبات الإلكترونية للشركة داخل لوحة التحكم
     */
    public function orders(): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $orders = $this->scopeStoreOrdersToAssignedBranches(
            StoreOrder::where('tenant_id', $tenantId),
            request()
        )->with(['items', 'paymentReviewer', 'salesOrder.warehouse'])
            ->latest()
            ->paginate(20);

        return response()->json($orders);
    }

    /**
     * تحديث حالة طلب المتجر الإلكتروني (تأكيد، شحن، تسليم، إلغاء)
     */
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $validated = $request->validate([
            'status' => 'required|string|in:new,confirmed,preparing,shipped,delivered,cancelled',
        ]);
        $nextStatus = $validated['status'];

        try {
            return DB::transaction(function () use ($id, $tenantId, $nextStatus, $request) {
                $order = $this->scopeStoreOrdersToAssignedBranches(
                    StoreOrder::where('tenant_id', $tenantId),
                    $request
                )->lockForUpdate()->findOrFail($id);

                $currentStatus = (string) $order->status;
                if ($currentStatus === $nextStatus) {
                    return response()->json([
                        'message' => 'حالة الطلب محدثة بالفعل.',
                        'order' => $order->load(['items', 'paymentReviewer']),
                    ]);
                }

                $statusRank = [
                    'new' => 0,
                    'confirmed' => 1,
                    'preparing' => 2,
                    'shipped' => 3,
                    'delivered' => 4,
                ];

                if ($currentStatus === 'cancelled' || !array_key_exists($currentStatus, $statusRank)) {
                    return response()->json([
                        'error' => 'InvalidStatusTransition',
                        'message' => 'لا يمكن تغيير حالة هذا الطلب بعد إلغائه أو بسبب حالة تشغيلية غير معروفة.',
                    ], 422);
                }

                if ($nextStatus === 'cancelled') {
                    if ($statusRank[$currentStatus] >= $statusRank['shipped']) {
                        return response()->json([
                            'error' => 'InvalidStatusTransition',
                            'message' => 'لا يمكن إلغاء طلب تم شحنه أو تسليمه. يجب تسجيل مرتجع مبيعات وإشعار دائن.',
                        ], 422);
                    }

                    $this->storefrontService->restoreOrderInventory($order);
                } else {
                    if ($statusRank[$nextStatus] < $statusRank[$currentStatus]) {
                        return response()->json([
                            'error' => 'InvalidStatusTransition',
                            'message' => 'لا يمكن إرجاع حالة الطلب إلى مرحلة تشغيلية سابقة.',
                        ], 422);
                    }

                    if ($statusRank[$nextStatus] >= $statusRank['shipped']
                        && $statusRank[$currentStatus] < $statusRank['shipped']) {
                        if ($order->payment_method === 'instapay' && $order->payment_status !== 'verified_paid') {
                            return response()->json([
                                'error' => 'UnverifiedPayment',
                                'message' => 'لا يمكن شحن أو تسليم طلب InstaPay قبل اعتماد وتأكيد التحويل البنكي من الإدارة.',
                            ], 422);
                        }

                        if (!$order->sales_order_id) {
                            throw new InvalidArgumentException('طلب المتجر غير مرتبط بأمر بيع ERP؛ لا يمكن شحنه قبل إصلاح الربط.');
                        }

                        // Shipment is the stock-issue boundary: consume the reservation through the
                        // canonical sales workflow, create the invoice, and write the immutable stock ledger.
                        $this->salesService->fulfillOrder((string) $order->sales_order_id);
                    }
                }

                $order->update(['status' => $nextStatus]);

                return response()->json([
                    'message' => 'تم تحديث حالة طلب الشراء بنجاح',
                    'order' => $order->fresh(['items', 'paymentReviewer']),
                ]);
            });
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'error' => 'StorefrontOrderTransitionFailed',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * مراجعة واعتماد/رفض تحويل InstaPay يدوياً بواسطة المدير أو المحاسب
     * لا يتم الاعتماد الآلي أبداً بمجرد رفع الإيصال، بل يلزم اعتماد بشري موثق
     */
    public function verifyPayment(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $user = $request->user();
        if ($user && $user->role !== 'company_owner') {
            $allTenantBranchIds = \App\Models\Branch::where('tenant_id', $tenantId)->pluck('id')->all();
            if (!empty($allTenantBranchIds) && array_diff($allTenantBranchIds, $user->assignedBranchIds()) !== []) {
                return response()->json([
                    'error' => 'InsufficientBranchCoverage',
                    'message' => 'اعتماد تحويلات InstaPay وترحيلها محاسبيًا يتطلب صلاحية جميع فروع المنشأة.',
                ], 403);
            }
        }

        $isRejectRoute = str_ends_with($request->path(), '/reject');
        $isApproveRoute = str_ends_with($request->path(), '/approve');

        $approved = $isRejectRoute ? false : ($isApproveRoute ? true : (bool) $request->input('approved', false));

        $rules = [
            'approved' => 'nullable|boolean',
            'notes' => 'nullable|string|max:255',
        ];

        if (!$approved) {
            $rules['rejection_reason'] = 'required|string|min:3|max:255';
        } else {
            $rules['rejection_reason'] = 'nullable|string|max:255';
        }

        $validated = $request->validate($rules);

        // Check if $id belongs to a PaymentSubmission or a StoreOrder
        $submission = PaymentSubmission::withoutGlobalScopes()->where('tenant_id', $tenantId)->find($id);
        $orderId = $submission ? $submission->store_order_id : $id;
        if (!$orderId) {
            return response()->json(['error' => 'StoreOrderNotFound'], 404);
        }
        $this->scopeStoreOrdersToAssignedBranches(
            StoreOrder::where('tenant_id', $tenantId),
            $request
        )->findOrFail($orderId);

        try {
            $order = $this->storefrontService->verifyInstaPayPayment(
                $tenantId,
                $orderId,
                $request->user()->id,
                $approved,
                $validated['rejection_reason'] ?? $validated['notes'] ?? null
            );

            return response()->json([
                'message' => $approved
                    ? 'تم اعتماد تحويل InstaPay بنجاح وإصدار سند القبض المحاسبي وتوثيق العملية في سجل التدقيق'
                    : 'تم رفض تحويل InstaPay وتسجيل سبب الرفض بنجاح',
                'order' => $order,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'error' => 'InvalidPaymentVerification',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * استعراض قائمة التحويلات البنكية المعلقة بانتظار المراجعة والتدقيق المالي
     */
    public function pendingPayments(): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $user = request()->user();
        $branchIds = $user && $user->role !== 'company_owner' ? $user->assignedBranchIds() : null;
        $submissions = $this->storefrontService->getPendingPaymentSubmissions($tenantId, $branchIds);

        return response()->json([
            'submissions' => $submissions,
            'total_pending' => $submissions->count(),
        ]);
    }

    /**
     * تحديث إعدادات إنستاباي الخاصة بصاحب المصنع
     */
    public function updateInstaPaySettings(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $validated = $request->validate([
            'instapay_enabled' => 'nullable|boolean',
            'allow_instapay' => 'nullable|boolean',
            'instapay_identifier' => 'nullable|string|max:100',
            'instapay_display_name' => 'nullable|string|max:255',
            'instapay_instructions' => 'nullable|string',
            'instapay_account_verified' => 'nullable|boolean',
        ]);

        $settings = $this->storefrontService->updateInstaPaySettings($tenantId, $validated, $request->user()?->id);

        return response()->json([
            'message' => 'تم حفظ وتحديث إعدادات حساب InstaPay للمصنع بنجاح',
            'settings' => $settings,
        ]);
    }

    /**
     * رفع ملف إيصال تحويل InstaPay وحفظه في التخزين الخاص المشفر
     */
    public function uploadReceipt(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'receipt' => 'required|file|mimes:jpeg,png,jpg,webp,pdf|max:5120', // Max 5MB
            'order_number' => 'nullable|string|max:100',
            'customer_phone' => 'nullable|string|max:50',
            'instapay_reference' => 'nullable|string|max:100',
        ]);

        $file = $request->file('receipt');
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : 'public';

        $fileName = 'receipt_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs("private/receipts/{$tenantId}", $fileName);

        // If order credentials provided, update submission directly
        if (!empty($validated['order_number']) && !empty($validated['customer_phone']) && !empty($validated['instapay_reference'])) {
            $this->storefrontService->submitCustomerReceipt(
                $validated['order_number'],
                $validated['customer_phone'],
                $validated['instapay_reference'],
                $path,
                $tenantId !== 'public' ? $tenantId : null
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'تم رفع ملف الإيصال بنجاح',
            'receipt_path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
        ]);
    }

    /**
     * استعراض ملف الإيصال الخاص للمستخدمين المصرح لهم داخل المصنع
     */
    public function viewReceiptFile(Request $request, string $submissionId): \Symfony\Component\HttpFoundation\BinaryFileResponse|JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $submission = \App\Models\PaymentSubmission::where('tenant_id', $tenantId)->findOrFail($submissionId);
        if (!$submission->store_order_id) {
            return response()->json(['error' => 'StoreOrderNotFound'], 404);
        }
        $this->scopeStoreOrdersToAssignedBranches(
            StoreOrder::where('tenant_id', $tenantId),
            $request
        )->findOrFail($submission->store_order_id);

        if (!$submission->receipt_file_path || !\Illuminate\Support\Facades\Storage::exists($submission->receipt_file_path)) {
            return response()->json([
                'error' => 'ReceiptNotFound',
                'message' => 'ملف الإيصال غير متوفر على الخادم.',
            ], 404);
        }

        $fullPath = \Illuminate\Support\Facades\Storage::path($submission->receipt_file_path);
        return response()->file($fullPath);
    }

    /**
     * تتبع طلب الشراء للعملاء دون اشتراط تسجيل دخول
     */
    public function trackOrder(Request $request, ?string $tenantId = null): JsonResponse
    {
        $tenant = $this->domainResolver->resolveStorefrontTenant($request, $tenantId);
        $resolvedTenantId = $tenant?->id;

        $orderNumber = $request->query('order_number') ?: $request->input('order_number');
        $customerPhone = $request->query('customer_phone') ?: $request->input('customer_phone');

        if (!$orderNumber || !$customerPhone) {
            return response()->json([
                'error' => 'MissingTrackingParameters',
                'message' => 'يرجى إدخال رقم الطلب ورقم الهاتف المسجل لمتابعة حالة الشحنة.',
            ], 422);
        }

        $order = $this->storefrontService->trackOrder($orderNumber, $customerPhone, $resolvedTenantId);

        if (!$order) {
            return response()->json([
                'error' => 'OrderNotFound',
                'message' => 'لم نتمكن من العثور على طلب مطابق لرقم الطلب ورقم الهاتف المدخلين.',
            ], 404);
        }

        $settings = $this->storefrontService->getStoreDetails($order->tenant_id);

        return response()->json([
            'order' => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'customer_name' => $order->customer_name,
                'shipping_address' => $order->shipping_address,
                'city' => $order->city,
                'payment_method' => $order->payment_method,
                'payment_status' => $order->payment_status,
                'payment_rejection_reason' => $order->payment_rejection_reason,
                'instapay_reference' => $order->instapay_reference,
                'instapay_receipt_url' => $order->instapay_receipt_url,
                'subtotal' => $order->subtotal,
                'shipping_fee' => $order->shipping_fee,
                'total_amount' => $order->total_amount,
                'created_at' => $order->created_at?->toIso8601String(),
                'items' => $order->items->map(fn($item) => [
                    'id' => $item->id,
                    'product_name' => $item->product_name ?: ($item->variant?->garmentModel?->name ?? 'منتج ملابس'),
                    'sku' => $item->sku ?: ($item->variant?->sku ?? ''),
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'total_price' => $item->total_price,
                    'size' => $item->variant?->size?->name,
                    'color' => $item->variant?->color?->name,
                ]),
            ],
            'store_info' => [
                'store_name' => $settings['store_settings']->store_name ?? 'Garment Store',
                'currency' => $order->tenant?->currency ?? 'EGP',
                'instapay_identifier' => $settings['store_settings']->instapay_identifier ?? ($settings['store_settings']->instapay_handle ?? ''),
                'instapay_display_name' => $settings['store_settings']->instapay_display_name ?? ($settings['store_settings']->instapay_account_name ?? ''),
                'instapay_account_name' => $settings['store_settings']->instapay_account_name ?? '',
                'instapay_handle' => $settings['store_settings']->instapay_handle ?? '',
                'instapay_instructions' => $settings['store_settings']->instapay_instructions ?? '',
                'contact_whatsapp' => $settings['store_settings']->contact_whatsapp ?? '',
            ],
        ]);
    }

    /**
     * رفع أو تحديث إيصال/مرجع تحويل InstaPay من طرف العميل
     */
    public function submitReceipt(Request $request, ?string $tenantId = null): JsonResponse
    {
        $tenant = $this->domainResolver->resolveStorefrontTenant($request, $tenantId);
        $resolvedTenantId = $tenant?->id;

        $validated = $request->validate([
            'order_number' => 'required|string|max:100',
            'customer_phone' => 'required|string|max:50',
            'instapay_reference' => 'required|string|max:100',
            'instapay_receipt_url' => 'nullable|string',
        ]);

        try {
            $order = $this->storefrontService->submitCustomerReceipt(
                $validated['order_number'],
                $validated['customer_phone'],
                $validated['instapay_reference'],
                $validated['instapay_receipt_url'] ?? null,
                $resolvedTenantId
            );

            return response()->json([
                'message' => 'تم استلام بيانات التحويل بنجاح، وسيقوم فريق المراجعة بتأكيد الطلب وشحنه.',
                'order' => [
                    'order_number' => $order->order_number,
                    'status' => $order->status,
                    'payment_method' => $order->payment_method,
                    'payment_status' => $order->payment_status,
                    'instapay_reference' => $order->instapay_reference,
                    'instapay_receipt_url' => $order->instapay_receipt_url,
                ],
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'error' => 'InvalidReceiptSubmission',
                'message' => $e->getMessage(),
            ], 422);
        }
    }
    private function scopeStoreOrdersToAssignedBranches($query, ?Request $request = null)
    {
        $user = ($request ?? request())->user();
        if (!$user || !$user->shouldEnforceBranchScope()) {
            return $query;
        }

        $branchIds = $user->assignedBranchIds();

        return $query->where(function ($q) use ($branchIds) {
            $q->whereNull('sales_order_id')
                ->orWhereHas('salesOrder.warehouse', fn ($warehouseQuery) => $warehouseQuery->whereIn('branch_id', $branchIds));
        });
    }


}


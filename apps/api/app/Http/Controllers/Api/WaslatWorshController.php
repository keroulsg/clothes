<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Rfq;
use App\Services\WaslatWorshService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class WaslatWorshController extends Controller
{
    public function __construct(
        protected WaslatWorshService $waslatService
    ) {}

    /**
     * التحقق من أهلية باقة المستأجر لاستخدام سوق وصلة ورش
     */
    public function eligibility(Request $request, \App\Services\SubscriptionUsageService $subscriptionService): JsonResponse
    {
        $user = $request->user();
        if ($user && $user->role === 'platform_admin') {
            return response()->json([
                'is_eligible' => true,
                'entitlement' => [
                    'allowed' => true,
                    'plan_code' => 'enterprise',
                    'plan_name' => 'Platform Administration',
                ],
            ]);
        }

        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : $user?->tenant_id;
        if (!$tenantId) {
            return response()->json([
                'is_eligible' => false,
                'error' => 'UNAUTHORIZED_TENANT',
                'message' => 'لم يتم التعرف على حساب المصنع.',
            ], 401);
        }

        $entitlement = $subscriptionService->hasFeatureEntitlement($tenantId, 'waslat_worsh_marketplace');

        $requesterSub = \App\Models\MarketplaceRequesterSubscription::where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->first();

        $isRequesterEligible = ($requesterSub && !$requesterSub->isExpired()) || $entitlement['allowed'];
        $remainingQuota = $requesterSub ? $requesterSub->remaining_rfq_count : ($entitlement['allowed'] ? 999999 : 0);

        return response()->json([
            'is_eligible' => $isRequesterEligible,
            'is_requester_eligible' => $isRequesterEligible,
            'is_provider_eligible' => $entitlement['allowed'],
            'remaining_rfq_quota' => $remainingQuota,
            'requester_subscription' => $requesterSub ? [
                'id' => $requesterSub->id,
                'status' => $requesterSub->status,
                'plan_code' => $requesterSub->plan_code,
                'allowed_rfq_count' => $requesterSub->allowed_rfq_count,
                'consumed_rfq_count' => $requesterSub->consumed_rfq_count,
                'remaining_rfq_count' => $requesterSub->remaining_rfq_count,
                'expires_at' => $requesterSub->expires_at?->toIso8601String(),
            ] : null,
            'entitlement' => $entitlement,
        ]);
    }

    /**
     * استعراض دليل الورش ومقدمي الطاقة الإنتاجية
     */
    public function workshops(Request $request): JsonResponse
    {
        $filters = $request->only(['specialty_type', 'governorate', 'search']);
        $workshops = $this->waslatService->listWorkshops($filters, (int) ($request->per_page ?? 15));

        return response()->json($workshops);
    }

    /**
     * تسجيل ورشة تصنيع جديدة في دليل منصة وصلة ورش
     */
    public function storeWorkshop(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'workshop_name' => 'required|string|max:255',
            'specialty_type' => 'required|string|in:sewing,cutting,embroidery,printing,finishing,full_cmt',
            'active_machines_count' => 'required|integer|min:1',
            'daily_capacity_pieces' => 'required|integer|min:10',
            'governorate' => 'required|string',
            'city' => 'nullable|string',
            'address' => 'nullable|string',
            'phone' => 'required|string|max:32',
            'contact_person' => 'required|string|max:255',
        ]);

        $profile = $this->waslatService->createWorkshopProfile($validated);

        return response()->json([
            'message' => 'تم تسجيل ورشة التصنيع في دليل منصة وصلة ورش بنجاح.',
            'workshop' => $profile,
        ], 201);
    }

    /**
     * استعراض طلبات عروض الأسعار المطروحة (RFQs)
     */
    public function rfqs(Request $request): JsonResponse
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : $request->user()?->tenant_id;
        $filters = $request->only(['status', 'service_type', 'tenant_id', 'search', 'my_history']);
        $rfqs = $this->waslatService->listRfqs($filters, (int) ($request->per_page ?? 15), $tenantId);

        return response()->json($rfqs);
    }

    /**
     * إنشاء طلب قص وتشغيل للغير جديد (Stage C: Create Request)
     */
    public function storeRfq(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'model_name' => 'nullable|string|max:255',
            'garment_model_id' => 'nullable|uuid|exists:garment_models,id',
            'garment_category' => 'nullable|string|max:64',
            'service_type' => 'required|string',
            'priority' => 'nullable|string|in:low,normal,urgent',
            'specifications' => 'nullable|string',
            'target_quantity' => 'required|integer|min:1',
            'expected_delivery_date' => 'required|date',
            'max_budget_per_piece' => 'nullable|numeric|min:0',
            'fabric_responsibility' => 'nullable|string|in:seeker_provided,workshop_sourced',
            'fabric_details' => 'nullable|array',
            'production_details' => 'nullable|array',
            'logistics' => 'nullable|array',
            'status' => 'nullable|string|in:draft,published,open',
            'publish' => 'nullable|boolean',
            'terms_version' => 'nullable|string|max:32',
        ]);

        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : $request->user()->tenant_id;

        try {
            $rfq = $this->waslatService->createRfq($tenantId, $validated);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error' => 'VALIDATION_FAILED',
                'error_code' => 'INVALID_QUANTITY_BREAKDOWN',
            ], 422);
        }

        return response()->json([
            'message' => $rfq->status === 'draft' ? 'تم حفظ مسودة طلب القص بنجاح.' : 'تم نشر طلب القص في سوق منصة وصلة ورش بنجاح.',
            'rfq' => $rfq,
        ], 201);
    }

    /**
     * تعديل مسودة طلب قص (Update Draft RFQ)
     */
    public function updateRfq(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'model_name' => 'nullable|string|max:255',
            'garment_model_id' => 'nullable|uuid|exists:garment_models,id',
            'garment_category' => 'nullable|string|max:64',
            'service_type' => 'sometimes|required|string',
            'priority' => 'nullable|string|in:low,normal,urgent',
            'specifications' => 'nullable|string',
            'target_quantity' => 'sometimes|required|integer|min:1',
            'expected_delivery_date' => 'sometimes|required|date',
            'max_budget_per_piece' => 'nullable|numeric|min:0',
            'fabric_responsibility' => 'nullable|string|in:seeker_provided,workshop_sourced',
            'fabric_details' => 'nullable|array',
            'production_details' => 'nullable|array',
            'logistics' => 'nullable|array',
        ]);

        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : $request->user()->tenant_id;

        try {
            $rfq = $this->waslatService->updateRfq($id, $tenantId, $validated);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error' => 'UPDATE_FAILED',
                'error_code' => str_contains($e->getMessage(), 'بعد نشره') ? 'RFQ_NOT_EDITABLE' : 'INVALID_QUANTITY_BREAKDOWN',
            ], 422);
        }

        return response()->json([
            'message' => 'تم تحديث مسودة طلب القص بنجاح.',
            'rfq' => $rfq,
        ]);
    }

    /**
     * نشر طلب القص رسمياً في السوق الصناعي (Publish RFQ)
     */
    public function publishRfq(Request $request, string $id): JsonResponse
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : $request->user()->tenant_id;

        try {
            $rfq = $this->waslatService->publishRfq($id, $tenantId, $request->only(['terms_version']));
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            $errCode = str_contains($e->getMessage(), 'WASLAT_WORSH_QUOTA_EXHAUSTED')
                ? 'MarketplaceQuotaExhausted'
                : 'WASLAT_WORSH_SUBSCRIPTION_REQUIRED';

            return response()->json([
                'error' => $errCode,
                'error_code' => $errCode,
                'message' => $e->getMessage(),
            ], $e->getStatusCode());
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'تم نشر طلب القص في سوق وصلة ورش بنجاح.',
            'rfq' => $rfq,
        ]);
    }

    /**
     * إلغاء طلب القص (Cancel RFQ)
     */
    public function cancelRfq(Request $request, string $id): JsonResponse
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : $request->user()->tenant_id;

        try {
            $rfq = $this->waslatService->cancelRfq($id, $tenantId, $request->input('reason'));
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'تم إلغاء طلب القص بنجاح.',
            'rfq' => $rfq,
        ]);
    }

    /**
     * عرض تفاصيل طلب الـ RFQ مع عزل البيانات الحساسة لغير المالك
     */
    public function showRfq(Request $request, string $id): JsonResponse
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : $request->user()?->tenant_id;
        $rfq = Rfq::withoutGlobalScopes()->with(['tenant', 'bids.workshop', 'awardedBid', 'garmentModel'])->findOrFail($id);

        $isOwner = $tenantId && $rfq->tenant_id === $tenantId;
        $isAdmin = $request->user() && $request->user()->role === 'platform_admin';

        $isSelectedProvider = false;
        if ($rfq->awarded_bid_id && $tenantId) {
            $awardedBid = $rfq->awardedBid ?? RfqBid::with('workshop')->find($rfq->awarded_bid_id);
            if ($awardedBid && $awardedBid->workshop && $awardedBid->workshop->tenant_id === $tenantId) {
                $isSelectedProvider = true;
            }
        }

        // مسودات الطلبات والطلبات بعد الترسية محجوبة عن مقدمي الخدمة الآخرين، ولكنها متاحة لصاحب الطلب والمزود المختار ومسؤول المنصة
        if (!$isOwner && !$isAdmin && !$isSelectedProvider && !in_array($rfq->status, ['published', 'open'], true)) {
            return response()->json([
                'message' => 'الطلب المطلوب غير متاح في السوق أو تم ترسيته لمزود آخر.',
            ], 404);
        }

        $masked = $this->waslatService->maskPrivateDetails($rfq, $tenantId);

        return response()->json($masked);
    }

    /**
     * رفع ملف فني مرفق لطلب القص (Upload Technical Attachment)
     */
    public function uploadAttachment(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:10240', // 10MB
            'file_type' => 'nullable|string|in:model_photo,pattern_cad,marker_file,tech_spec,other',
        ]);

        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : $request->user()->tenant_id;

        try {
            $attachment = $this->waslatService->uploadAttachment(
                $id,
                $tenantId,
                $request->file('file'),
                $request->input('file_type', 'tech_spec')
            );
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'تم رفع الملف الفني المرفق بنجاح.',
            'attachment' => $attachment,
        ], 201);
    }

    /**
     * تحميل الملف المرفق مع التحقق الصارم من الصلاحيات والملكية
     */
    public function downloadAttachment(Request $request, string $id, string $attachmentId)
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : $request->user()?->tenant_id;
        $isAdmin = $request->user() && $request->user()->role === 'platform_admin';

        try {
            $fileData = $this->waslatService->getAttachmentForDownload($id, $attachmentId, (string) $tenantId, $isAdmin);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 403);
        }

        return \Illuminate\Support\Facades\Storage::disk('local')->download($fileData['storage_path'], $fileData['filename'], [
            'Content-Type' => $fileData['mime_type'],
        ]);
    }

    /**
     * حذف مرفق من مسودة طلب القص
     */
    public function deleteAttachment(Request $request, string $id, string $attachmentId): JsonResponse
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : $request->user()->tenant_id;

        try {
            $rfq = $this->waslatService->deleteAttachment($id, $attachmentId, $tenantId);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'تم حذف المرفق بنجاح.',
            'rfq' => $rfq,
        ]);
    }

    /**
     * تقديم عرض سعر من ورشة لطلب تشغيل
     */
    public function submitBid(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'workshop_profile_id' => 'required|uuid|exists:workshop_profiles,id',
            'unit_rate' => 'required|numeric|min:0.01',
            'promised_lead_days' => 'required|integer|min:1|max:180',
            'notes' => 'nullable|string|max:1000',
        ]);

        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : $request->user()?->tenant_id;
        $validated['tenant_id'] = $tenantId;

        try {
            $bid = $this->waslatService->submitBid($id, $validated['workshop_profile_id'], $validated);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            $err = 'Forbidden';
            if (str_contains($e->getMessage(), 'WorkshopNotVerified')) {
                $err = 'WorkshopNotVerified';
            } elseif (str_contains($e->getMessage(), 'SelfBiddingForbidden')) {
                $err = 'SelfBiddingForbidden';
            }
            return response()->json([
                'error' => $err,
                'message' => $e->getMessage(),
            ], $e->getStatusCode());
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'تم تقديم عرض السعر بنجاح.',
            'bid' => $bid,
        ], 201);
    }

    /**
     * قبول وترسية العرض الفائز وتحويله إلى أمر تشغيل JobOrder
     */
    public function acceptBid(Request $request, string $id, string $bidId): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        try {
            $result = $this->waslatService->acceptBid($id, $bidId, $tenantId);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'تم قبول العرض الفائز وترسيته وتحويله إلى أمر تشغيل رسمي بنجاح.',
            'result' => $result,
        ]);
    }

    /**
     * تقييم الورشة بعد إنجاز الطلب
     */
    public function storeReview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'rfq_id' => 'required|uuid|exists:rfqs,id',
            'workshop_profile_id' => 'required|uuid|exists:workshop_profiles,id',
            'quality_rating' => 'required|integer|min:1|max:5',
            'timeliness_rating' => 'required|integer|min:1|max:5',
            'communication_rating' => 'required|integer|min:1|max:5',
            'review_notes' => 'nullable|string|max:1000',
        ]);

        $validated['reviewer_tenant_id'] = app('current_tenant_id');

        $review = $this->waslatService->submitReview($validated);

        return response()->json([
            'message' => 'تم تسجيل تقييم الورشة بنجاح.',
            'review' => $review,
        ], 201);
    }

    /**
     * استعراض العروض المقدمة من ورش المصنع الحالي (P4: Factory My Submitted Bids)
     */
    public function myBids(Request $request): JsonResponse
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : $request->user()?->tenant_id;
        if (!$tenantId) {
            return response()->json(['error' => 'UNAUTHORIZED_TENANT'], 401);
        }

        $bids = $this->waslatService->listMyBids($tenantId);

        return response()->json([
            'bids' => $bids,
            'total' => count($bids),
        ]);
    }

    /**
     * سحب عرض سعر مقدم من قبل المصنع قبل اختياره (P4: Withdraw Bid)
     */
    public function withdrawBid(Request $request, string $id): JsonResponse
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : $request->user()?->tenant_id;
        if (!$tenantId) {
            return response()->json(['error' => 'UNAUTHORIZED_TENANT'], 401);
        }

        try {
            $this->waslatService->withdrawBid($id, $tenantId);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'تم سحب عرض السعر بنجاح.',
        ]);
    }

    /**
     * استعراض العمليات الجارية المسندة للورشة بعد الفوز بالعرض (P4: Factory Selected Operations)
     */
    public function myOperations(Request $request): JsonResponse
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : $request->user()?->tenant_id;
        if (!$tenantId) {
            return response()->json(['error' => 'UNAUTHORIZED_TENANT'], 401);
        }

        $operations = $this->waslatService->listMyOperations($tenantId);

        return response()->json([
            'operations' => $operations,
            'total' => count($operations),
        ]);
    }

    /**
     * تحديث الحالة التشغيلية للطلب بعد اختيار العرض (P3 & P4: Update Operation Status)
     */
    public function updateOperationStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:offer_selected,in_progress,delivered,completed,cancelled',
            'notes' => 'nullable|string|max:1000',
        ]);

        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : $request->user()?->tenant_id;
        $isAdmin = $request->user() && $request->user()->role === 'platform_admin';

        if (!$tenantId && !$isAdmin) {
            return response()->json(['error' => 'UNAUTHORIZED_TENANT'], 401);
        }

        try {
            $result = $this->waslatService->updateOperationStatus($id, $validated['status'], $tenantId ?? '', $validated['notes'] ?? null, $isAdmin);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'تم تحديث الحالة التشغيلية لطلب القص بنجاح.',
            'operation' => $result,
        ]);
    }
}


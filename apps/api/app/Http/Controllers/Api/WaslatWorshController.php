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
        $filters = $request->only(['status', 'service_type', 'tenant_id', 'search']);
        $rfqs = $this->waslatService->listRfqs($filters, (int) ($request->per_page ?? 15));

        return response()->json($rfqs);
    }

    /**
     * إنشاء طلب عرض أسعار وتشغيل للغير جديد
     */
    public function storeRfq(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'service_type' => 'required|string|in:sewing,cutting,embroidery,printing,full_cmt',
            'specifications' => 'required|string',
            'target_quantity' => 'required|integer|min:1',
            'expected_delivery_date' => 'required|date|after:today',
            'max_budget_per_piece' => 'nullable|numeric|min:0',
            'fabric_responsibility' => 'nullable|string|in:seeker_provided,workshop_sourced',
        ]);

        $tenantId = app('current_tenant_id');

        try {
            $rfq = $this->waslatService->createRfq($tenantId, $validated);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error' => 'QUOTA_EXCEEDED',
            ], 422);
        }

        return response()->json([
            'message' => 'تم نشر طلب عرض السعر في سوق منصة وصلة ورش بنجاح.',
            'rfq' => $rfq,
        ], 201);
    }

    /**
     * عرض تفاصيل طلب الـ RFQ مع العروض المقدمة
     */
    public function showRfq(string $id): JsonResponse
    {
        $rfq = Rfq::with(['tenant', 'bids.workshop', 'awardedBid'])->findOrFail($id);

        return response()->json($rfq);
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

        try {
            $bid = $this->waslatService->submitBid($id, $validated['workshop_profile_id'], $validated);
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
}


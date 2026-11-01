<?php

namespace App\Services;

use App\Models\JobOrder;
use App\Models\MarketplaceCommission;
use App\Models\Rfq;
use App\Models\RfqBid;
use App\Models\Tenant;
use App\Models\WorkshopProfile;
use App\Models\WorkshopReview;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class WaslatWorshService
{
    public function __construct(
        protected SubscriptionUsageService $subscriptionService,
        protected SubcontractingService $subcontractingService
    ) {}

    /**
     * تسجيل أو تحديث ملف تعريف ورشة/مشغل في المنصة
     */
    public function createWorkshopProfile(array $data): WorkshopProfile
    {
        return DB::transaction(function () use ($data) {
            return WorkshopProfile::create([
                'tenant_id' => $data['tenant_id'] ?? (app()->bound('current_tenant_id') ? app('current_tenant_id') : null),
                'workshop_name' => $data['workshop_name'],
                'specialty_type' => $data['specialty_type'] ?? 'full_cmt',
                'active_machines_count' => (int) ($data['active_machines_count'] ?? 10),
                'daily_capacity_pieces' => (int) ($data['daily_capacity_pieces'] ?? 200),
                'governorate' => $data['governorate'] ?? 'القاهرة',
                'city' => $data['city'] ?? null,
                'address' => $data['address'] ?? null,
                'phone' => $data['phone'],
                'contact_person' => $data['contact_person'],
                'is_verified' => $data['is_verified'] ?? true,
                'rating_average' => 5.00,
                'completed_jobs_count' => 0,
            ]);
        });
    }

    /**
     * استعراض دليل الورش ومقدمي الطاقة الإنتاجية
     */
    public function listWorkshops(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = WorkshopProfile::query()->with('tenant');

        if (!empty($filters['specialty_type'])) {
            $query->where('specialty_type', $filters['specialty_type']);
        }

        if (!empty($filters['governorate'])) {
            $query->where('governorate', $filters['governorate']);
        }

        if (!empty($filters['search'])) {
            $s = $filters['search'];
            $query->where(function ($q) use ($s) {
                $q->where('workshop_name', 'like', "%{$s}%")
                  ->orWhere('contact_person', 'like', "%{$s}%")
                  ->orWhere('city', 'like', "%{$s}%");
            });
        }

        return $query->latest()->paginate($perPage);
    }

    /**
     * طرح طلب عرض سعر وتشغيل للغير (Publish RFQ)
     */
    public function createRfq(string $tenantId, array $data): Rfq
    {
        app()->instance('current_tenant_id', $tenantId);

        // فحص حصة المنصة الشهرية في باقة المصنع
        $quotaCheck = $this->subscriptionService->checkQuota($tenantId, 'marketplace_bids', 1);
        if (!$quotaCheck['allowed']) {
            throw new InvalidArgumentException($quotaCheck['message'] ?? 'عفواً، لقد استنفذت حصة عروض الأسعار المتاحة في باقتك الشهرية.');
        }

        return DB::transaction(function () use ($tenantId, $data) {
            $year = date('Y');
            $count = Rfq::withoutGlobalScopes()->where('tenant_id', $tenantId)->count() + 1;
            $rfqNumber = 'RFQ-' . $year . '-' . str_pad((string) $count, 4, '0', STR_PAD_LEFT);

            $rfq = Rfq::create([
                'tenant_id' => $tenantId,
                'rfq_number' => $rfqNumber,
                'title' => $data['title'],
                'service_type' => $data['service_type'] ?? 'full_cmt',
                'specifications' => $data['specifications'],
                'target_quantity' => (int) $data['target_quantity'],
                'expected_delivery_date' => $data['expected_delivery_date'],
                'max_budget_per_piece' => isset($data['max_budget_per_piece']) ? (float) $data['max_budget_per_piece'] : null,
                'fabric_responsibility' => $data['fabric_responsibility'] ?? 'seeker_provided',
                'status' => 'open',
            ]);

            // تسجيل استهلاك الحصة
            $this->subscriptionService->recordUsage(
                $tenantId,
                'marketplace_bids',
                1,
                'RFQ-' . $rfq->id,
                'Rfq',
                $rfq->id
            );

            return $rfq->load('tenant');
        });
    }

    /**
     * استعراض طلبات عروض الأسعار المطروحة في السوق الصناعي
     */
    public function listRfqs(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Rfq::query()->with(['tenant', 'bids.workshop']);

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['service_type'])) {
            $query->where('service_type', $filters['service_type']);
        }

        if (!empty($filters['tenant_id'])) {
            $query->where('tenant_id', $filters['tenant_id']);
        }

        if (!empty($filters['search'])) {
            $s = $filters['search'];
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")
                  ->orWhere('rfq_number', 'like', "%{$s}%")
                  ->orWhere('specifications', 'like', "%{$s}%");
            });
        }

        return $query->latest()->paginate($perPage);
    }

    /**
     * تقديم عرض سعر من ورشة لطلب تصنيع (Submit Bid)
     */
    public function submitBid(string $rfqId, string $workshopProfileId, array $data): RfqBid
    {
        return DB::transaction(function () use ($rfqId, $workshopProfileId, $data) {
            $rfq = Rfq::withoutGlobalScopes()->findOrFail($rfqId);

            if ($rfq->status !== 'open') {
                throw new InvalidArgumentException('طلب عروض الأسعار غير متاح لاستقبال عروض جديدة (مغلق أو تم ترسيته مسبقاً).');
            }

            $workshop = WorkshopProfile::findOrFail($workshopProfileId);

            // منع تقديم أكثر من عرض لنفس الورشة على نفس الطلب
            $existing = RfqBid::where('rfq_id', $rfq->id)
                ->where('workshop_profile_id', $workshop->id)
                ->first();

            if ($existing) {
                throw new InvalidArgumentException("قدمت الورشة ({$workshop->workshop_name}) عرضاً سابقاً لهذا الطلب بالفعل.");
            }

            $rate = (float) $data['unit_rate'];
            if ($rate <= 0) {
                throw new InvalidArgumentException('سعر القطعة المعروض يجب أن يكون أكبر من الصفر.');
            }

            return RfqBid::create([
                'rfq_id' => $rfq->id,
                'workshop_profile_id' => $workshop->id,
                'unit_rate' => $rate,
                'promised_lead_days' => (int) ($data['promised_lead_days'] ?? 7),
                'notes' => $data['notes'] ?? null,
                'status' => 'submitted',
            ])->load(['rfq', 'workshop']);
        });
    }

    /**
     * قبول العرض الفائز وترسيته مع تحويله تلقائياً إلى أمر تشغيل JobOrder واحتساب العمولة
     */
    public function acceptBid(string $rfqId, string $bidId, string $seekerTenantId): array
    {
        app()->instance('current_tenant_id', $seekerTenantId);

        return DB::transaction(function () use ($rfqId, $bidId, $seekerTenantId) {
            $rfq = Rfq::where('tenant_id', $seekerTenantId)->findOrFail($rfqId);

            if ($rfq->status !== 'open') {
                throw new InvalidArgumentException('لا يمكن قبول عرض على طلب غير مفتوح.');
            }

            $bid = RfqBid::where('rfq_id', $rfq->id)->findOrFail($bidId);
            $workshop = WorkshopProfile::findOrFail($bid->workshop_profile_id);

            // ترقية العرض الفائز ورفض العروض الأخرى
            $bid->status = 'accepted';
            $rfq->awarded_bid_id = $bid->id;
            $rfq->status = 'awarded';

            RfqBid::where('rfq_id', $rfq->id)
                ->where('id', '!=', $bid->id)
                ->update(['status' => 'rejected']);

            // 1. تحويل العرض إلى أمر تشغيل رسمي JobOrder داخل نظام الـ CMT للشركة الباحثة
            $grossAmount = round((float) $bid->unit_rate * (int) $rfq->target_quantity, 4);

            $jobOrder = JobOrder::create([
                'tenant_id' => $seekerTenantId,
                'order_number' => 'JOB-WW-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4)),
                'customer_name' => $workshop->workshop_name,
                'service_type' => $rfq->service_type === 'cutting' ? 'contract_cutting' : 'cmt',
                'total_target_quantity' => $rfq->target_quantity,
                'unit_rate' => $bid->unit_rate,
                'status' => 'pending_receipt',
                'target_delivery_date' => $rfq->expected_delivery_date,
                'notes' => "أمر تشغيل خارجي مرسى عبر منصة وصلة ورش للورشة: {$workshop->workshop_name}. هاتف: {$workshop->phone}. مدة التوريد المتعهد بها: {$bid->promised_lead_days} أيام.",
            ]);

            $bid->converted_job_order_id = $jobOrder->id;
            $bid->save();
            $rfq->save();

            // 2. احتساب عمولة المنصة (Marketplace Commission: 3%)
            $commissionRate = 3.00;
            $commissionAmount = round(($grossAmount * $commissionRate) / 100, 4);

            $commission = MarketplaceCommission::create([
                'tenant_id' => $seekerTenantId,
                'rfq_id' => $rfq->id,
                'rfq_bid_id' => $bid->id,
                'job_order_id' => $jobOrder->id,
                'gross_amount' => $grossAmount,
                'commission_rate' => $commissionRate,
                'commission_amount' => $commissionAmount,
                'status' => 'pending',
            ]);

            return [
                'rfq' => $rfq->fresh(['bids.workshop', 'awardedBid']),
                'awarded_bid' => $bid->fresh(),
                'job_order' => $jobOrder,
                'commission' => $commission,
            ];
        });
    }

    /**
     * تقييم الورشة بعد إتمام التشغيل
     */
    public function submitReview(array $data): WorkshopReview
    {
        return DB::transaction(function () use ($data) {
            $rfq = Rfq::withoutGlobalScopes()->findOrFail($data['rfq_id']);
            $workshop = WorkshopProfile::findOrFail($data['workshop_profile_id']);

            $review = WorkshopReview::create([
                'rfq_id' => $rfq->id,
                'workshop_profile_id' => $workshop->id,
                'reviewer_tenant_id' => $data['reviewer_tenant_id'],
                'quality_rating' => (int) ($data['quality_rating'] ?? 5),
                'timeliness_rating' => (int) ($data['timeliness_rating'] ?? 5),
                'communication_rating' => (int) ($data['communication_rating'] ?? 5),
                'review_notes' => $data['review_notes'] ?? null,
            ]);

            // إعادة احتساب المتوسط للورشة
            $avg = WorkshopReview::where('workshop_profile_id', $workshop->id)
                ->selectRaw('AVG((quality_rating + timeliness_rating + communication_rating) / 3.0) as overall')
                ->value('overall');

            $workshop->rating_average = round((float) $avg, 2);
            $workshop->completed_jobs_count += 1;
            $workshop->save();

            return $review->load(['workshop', 'reviewerTenant']);
        });
    }
}

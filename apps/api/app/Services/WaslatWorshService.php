<?php

namespace App\Services;

use App\Models\JobOrder;
use App\Models\MarketplaceCommission;
use App\Models\Rfq;
use App\Models\RfqBid;
use App\Models\Tenant;
use App\Models\WorkshopProfile;
use App\Models\WorkshopReview;
use Illuminate\Http\UploadedFile;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
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
     * التحقق من اتساق تفصيل المقاسات والألوان مع إجمالي كمية الطلب
     */
    public function validateBreakdownConsistency(int $totalQuantity, ?array $productionDetails): void
    {
        if (!$productionDetails) {
            return;
        }

        // 1. التحقق من تفصيل المقاسات
        if (!empty($productionDetails['size_breakdown']) && is_array($productionDetails['size_breakdown'])) {
            $sumSizes = 0;
            foreach ($productionDetails['size_breakdown'] as $item) {
                if (is_array($item) && isset($item['quantity'])) {
                    $sumSizes += (int) $item['quantity'];
                } elseif (is_numeric($item)) {
                    $sumSizes += (int) $item;
                }
            }

            if ($sumSizes > 0 && $sumSizes !== $totalQuantity) {
                throw new InvalidArgumentException("مجموع كميات تفصيل المقاسات ({$sumSizes}) لا يطابق إجمالي كمية الطلب الإجمالية ({$totalQuantity}).");
            }
        }

        // 2. التحقق من تفصيل الألوان
        if (!empty($productionDetails['color_breakdown']) && is_array($productionDetails['color_breakdown'])) {
            $sumColors = 0;
            foreach ($productionDetails['color_breakdown'] as $item) {
                if (is_array($item) && isset($item['quantity'])) {
                    $sumColors += (int) $item['quantity'];
                } elseif (is_numeric($item)) {
                    $sumColors += (int) $item;
                }
            }

            if ($sumColors > 0 && $sumColors !== $totalQuantity) {
                throw new InvalidArgumentException("مجموع كميات تفصيل الألوان ({$sumColors}) لا يطابق إجمالي كمية الطلب الإجمالية ({$totalQuantity}).");
            }
        }
    }

    /**
     * إنشاء طلب قص وتشغيل للغير جديد (Stage C: Request Creation)
     */
    public function createRfq(string $tenantId, array $data): Rfq
    {
        app()->instance('current_tenant_id', $tenantId);

        $targetQuantity = (int) $data['target_quantity'];
        $productionDetails = $data['production_details'] ?? null;
        $this->validateBreakdownConsistency($targetQuantity, $productionDetails);

        if (isset($data['publish']) && $data['publish'] === false) {
            $isPublished = false;
            $status = 'draft';
        } elseif (($data['status'] ?? null) === 'draft') {
            $isPublished = false;
            $status = 'draft';
        } elseif (!empty($data['publish']) || in_array($data['status'] ?? '', ['published'], true)) {
            $isPublished = true;
            $status = 'published';
        } elseif (($data['status'] ?? null) === 'open') {
            $isPublished = true;
            $status = 'open';
        } else {
            // السلوك التوافقي الافتراضي للطلبات العامة: مفتوح للعروض
            $isPublished = true;
            $status = 'open';
        }

        // إذا كان الطلب سينشر فورياً
        if ($isPublished) {
            $requesterSub = \App\Models\MarketplaceRequesterSubscription::where('tenant_id', $tenantId)
                ->where('status', 'active')
                ->first();

            if ($requesterSub) {
                if ($requesterSub->isExpired() || ($requesterSub->allowed_rfq_count - $requesterSub->consumed_rfq_count) <= 0) {
                    throw new \Symfony\Component\HttpKernel\Exception\HttpException(403, 'نفد رصيد طلبات القص المتاح في باقتك الحالية (WASLAT_WORSH_QUOTA_EXHAUSTED).');
                }
            } else {
                $entitlement = $this->subscriptionService->hasFeatureEntitlement($tenantId, 'waslat_worsh_marketplace');
                if (!$entitlement['allowed']) {
                    throw new \Symfony\Component\HttpKernel\Exception\HttpException(403, 'نشر طلبات القص يتطلب اشتراكاً نشطاً في باقة طلبات وصلة ورش أو باقة Enterprise.');
                }
            }
        }

        return DB::transaction(function () use ($tenantId, $data, $targetQuantity, $status, $isPublished) {
            $year = date('Y');
            $count = Rfq::withoutGlobalScopes()->where('tenant_id', $tenantId)->count() + 1;
            $rfqNumber = 'RFQ-' . $year . '-' . str_pad((string) $count, 4, '0', STR_PAD_LEFT);

            // خصم الحصة فورياً إذا تم النشر المباشر
            if ($isPublished) {
                $requesterSub = \App\Models\MarketplaceRequesterSubscription::where('tenant_id', $tenantId)
                    ->where('status', 'active')
                    ->lockForUpdate()
                    ->first();

                if ($requesterSub) {
                    $requesterSub->increment('consumed_rfq_count');
                }
            }

            $isPublished = in_array($status, ['published', 'open'], true);

            $rfq = Rfq::create([
                'tenant_id' => $tenantId,
                'rfq_number' => $rfqNumber,
                'title' => $data['title'],
                'model_name' => $data['model_name'] ?? null,
                'garment_model_id' => $data['garment_model_id'] ?? null,
                'garment_category' => $data['garment_category'] ?? null,
                'service_type' => $data['service_type'] ?? 'cutting',
                'priority' => $data['priority'] ?? 'normal',
                'specifications' => $data['specifications'] ?? '',
                'target_quantity' => $targetQuantity,
                'expected_delivery_date' => $data['expected_delivery_date'],
                'max_budget_per_piece' => isset($data['max_budget_per_piece']) ? (float) $data['max_budget_per_piece'] : null,
                'fabric_responsibility' => $data['fabric_responsibility'] ?? 'seeker_provided',
                'fabric_details' => $data['fabric_details'] ?? null,
                'production_details' => $data['production_details'] ?? null,
                'logistics' => $data['logistics'] ?? null,
                'attachments' => $data['attachments'] ?? [],
                'status' => $status,
                'published_at' => $isPublished ? now() : null,
                'terms_accepted_at' => $isPublished ? now() : null,
                'terms_version' => $isPublished ? ($data['terms_version'] ?? 'v1.0') : null,
            ]);

            if ($isPublished) {
                $this->subscriptionService->recordUsage(
                    $tenantId,
                    'marketplace_bids',
                    1,
                    'RFQ-' . $rfq->id,
                    'Rfq',
                    $rfq->id
                );
            }

            return $rfq->load(['tenant', 'garmentModel']);
        });
    }

    /**
     * تعديل مسودة طلب قص (Update Draft RFQ)
     */
    public function updateRfq(string $rfqId, string $tenantId, array $data): Rfq
    {
        app()->instance('current_tenant_id', $tenantId);

        $rfq = Rfq::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->findOrFail($rfqId);

        if ($rfq->status !== 'draft') {
            throw new InvalidArgumentException('لا يمكن تعديل تفاصيل طلب بعد نشره في السوق الصناعي لحماية موثوقية عروض الأسعار.');
        }

        $targetQuantity = isset($data['target_quantity']) ? (int) $data['target_quantity'] : $rfq->target_quantity;
        $productionDetails = $data['production_details'] ?? $rfq->production_details;
        $this->validateBreakdownConsistency($targetQuantity, $productionDetails);

        $rfq->fill([
            'title' => $data['title'] ?? $rfq->title,
            'model_name' => array_key_exists('model_name', $data) ? $data['model_name'] : $rfq->model_name,
            'garment_model_id' => array_key_exists('garment_model_id', $data) ? $data['garment_model_id'] : $rfq->garment_model_id,
            'garment_category' => array_key_exists('garment_category', $data) ? $data['garment_category'] : $rfq->garment_category,
            'service_type' => $data['service_type'] ?? $rfq->service_type,
            'priority' => $data['priority'] ?? $rfq->priority,
            'specifications' => $data['specifications'] ?? $rfq->specifications,
            'target_quantity' => $targetQuantity,
            'expected_delivery_date' => $data['expected_delivery_date'] ?? $rfq->expected_delivery_date,
            'max_budget_per_piece' => array_key_exists('max_budget_per_piece', $data) ? (float) $data['max_budget_per_piece'] : $rfq->max_budget_per_piece,
            'fabric_responsibility' => $data['fabric_responsibility'] ?? $rfq->fabric_responsibility,
            'fabric_details' => $data['fabric_details'] ?? $rfq->fabric_details,
            'production_details' => $productionDetails,
            'logistics' => $data['logistics'] ?? $rfq->logistics,
        ]);

        $rfq->save();

        return $rfq->load(['tenant', 'garmentModel']);
    }

    /**
     * نشر طلب القص رسمياً في السوق الصناعي (Publish Draft RFQ - Concurrency Safe & Quota Gated)
     */
    public function publishRfq(string $rfqId, string $tenantId, array $options = []): Rfq
    {
        app()->instance('current_tenant_id', $tenantId);

        return DB::transaction(function () use ($rfqId, $tenantId, $options) {
            $rfq = Rfq::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->findOrFail($rfqId);

            // تحقق السلوك اللا تكراري (Idempotency): إذا كان الطلب منشوراً مسبقاً، يتم إرجاعه دون خصم جديد
            if (in_array($rfq->status, ['published', 'open'], true)) {
                return $rfq->load(['tenant', 'garmentModel']);
            }

            if ($rfq->status !== 'draft') {
                throw new InvalidArgumentException("لا يمكن نشر الطلب في حالته الحالية ({$rfq->status}).");
            }

            // التحقق الإلزامي من اتساق الكميات قبل النشر
            $this->validateBreakdownConsistency($rfq->target_quantity, $rfq->production_details);

            // 1. فحص واستهلاك حصة باقة طالب الخدمة المستقلة مع قفل الصف التزامني (Row Lock)
            $requesterSub = \App\Models\MarketplaceRequesterSubscription::where('tenant_id', $tenantId)
                ->where('status', 'active')
                ->lockForUpdate()
                ->first();

            if ($requesterSub) {
                if ($requesterSub->isExpired()) {
                    throw new \Symfony\Component\HttpKernel\Exception\HttpException(403, 'انتهت صلاحية باقة طلبات القص الحالية. يرجى تجديد الاشتراك.');
                }

                $remaining = $requesterSub->allowed_rfq_count - $requesterSub->consumed_rfq_count;
                if ($remaining <= 0) {
                    throw new \Symfony\Component\HttpKernel\Exception\HttpException(403, 'نفد رصيد طلبات القص المتاح في باقتك الحالية (WASLAT_WORSH_QUOTA_EXHAUSTED).');
                }

                // خصم الحصة ذرياً
                $requesterSub->increment('consumed_rfq_count');
            } else {
                // فحص استحقاق باقة Enterprise لمصانع الـ ERP
                $entitlement = $this->subscriptionService->hasFeatureEntitlement($tenantId, 'waslat_worsh_marketplace');
                if (!$entitlement['allowed']) {
                    throw new \Symfony\Component\HttpKernel\Exception\HttpException(403, 'نشر طلبات القص يتطلب اشتراكاً نشطاً في باقة طلبات وصلة ورش أو باقة Enterprise.');
                }

                // تسجيل استهلاك الحصة للمصنع
                $this->subscriptionService->recordUsage(
                    $tenantId,
                    'marketplace_bids',
                    1,
                    'RFQ-' . $rfq->id,
                    'Rfq',
                    $rfq->id
                );
            }

            $rfq->status = 'published';
            $rfq->published_at = now();
            $rfq->terms_accepted_at = now();
            $rfq->terms_version = $options['terms_version'] ?? 'v1.0';
            $rfq->save();

            return $rfq->load(['tenant', 'garmentModel']);
        });
    }

    /**
     * إلغاء طلب القص (Cancel RFQ)
     */
    public function cancelRfq(string $rfqId, string $tenantId, ?string $reason = null): Rfq
    {
        app()->instance('current_tenant_id', $tenantId);

        $rfq = Rfq::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->findOrFail($rfqId);

        if (!in_array($rfq->status, ['draft', 'published', 'open'], true)) {
            throw new InvalidArgumentException("لا يمكن إلغاء الطلب وهو في حالة ({$rfq->status}).");
        }

        $rfq->status = 'cancelled';
        $rfq->save();

        return $rfq;
    }

    /**
     * رفع ملف فني مرفق لطلب القص (Secure Private Attachment Upload)
     */
    public function uploadAttachment(string $rfqId, string $tenantId, UploadedFile $file, string $fileType = 'tech_spec'): array
    {
        app()->instance('current_tenant_id', $tenantId);

        $rfq = Rfq::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->findOrFail($rfqId);

        if (!in_array($rfq->status, ['draft', 'published', 'open'], true)) {
            throw new InvalidArgumentException('لا يمكن إضافة مرفقات إلا لطلبات المسودة أو المنشورة قيد استقبال العروض.');
        }

        $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'zip', 'dxf', 'plt', 'iso', 'doc', 'docx', 'txt', 'csv'];
        $ext = strtolower($file->getClientOriginalExtension());
        if (!in_array($ext, $allowedExtensions, true)) {
            throw new InvalidArgumentException("نوع الملف غير مصرح به ({$ext}). الصيغ المسموحة: " . implode(', ', $allowedExtensions));
        }

        // الحجم الأقصى 10 ميجابايت
        if ($file->getSize() > 10 * 1024 * 1024) {
            throw new InvalidArgumentException('حجم الملف يتجاوز الحد الأقصى المسموح (10 ميجابايت).');
        }

        $attachmentId = (string) Str::uuid();
        $safeFileName = "{$attachmentId}.{$ext}";
        $storageDir = "private/waslat_worsh/{$tenantId}/rfqs/{$rfqId}";
        $path = $file->storeAs($storageDir, $safeFileName, 'local');

        $attachment = [
            'id' => $attachmentId,
            'name' => $file->getClientOriginalName(),
            'file_name' => $file->getClientOriginalName(),
            'file_type' => $fileType,
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'storage_path' => $path,
            'uploaded_at' => now()->toIso8601String(),
        ];

        $existing = is_array($rfq->attachments) ? $rfq->attachments : [];
        $existing[] = $attachment;
        $rfq->attachments = $existing;
        $rfq->save();

        // إرجاع بيانات المرفق مع حجب مسار التخزين الداخلي للأمان
        unset($attachment['storage_path']);
        return $attachment;
    }

    /**
     * حذف مرفق من مسودة طلب القص
     */
    public function deleteAttachment(string $rfqId, string $attachmentId, string $tenantId): Rfq
    {
        app()->instance('current_tenant_id', $tenantId);

        $rfq = Rfq::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->findOrFail($rfqId);

        if (!in_array($rfq->status, ['draft', 'published', 'open'], true)) {
            throw new InvalidArgumentException('لا يمكن حذف مرفقات لطلب ملغي أو منجز.');
        }

        $attachments = is_array($rfq->attachments) ? $rfq->attachments : [];
        $updated = [];
        $deleted = false;

        foreach ($attachments as $att) {
            if ($att['id'] === $attachmentId) {
                if (!empty($att['storage_path']) && Storage::disk('local')->exists($att['storage_path'])) {
                    Storage::disk('local')->delete($att['storage_path']);
                }
                $deleted = true;
            } else {
                $updated[] = $att;
            }
        }

        if (!$deleted) {
            throw new InvalidArgumentException('المرفق المطلوب حذفه غير موجود.');
        }

        $rfq->attachments = $updated;
        $rfq->save();

        return $rfq;
    }

    /**
     * الحصول على المسار الفعلي لتحميل المرفق مع التحقق الصارم من الصلاحيات
     */
    public function getAttachmentForDownload(string $rfqId, string $attachmentId, string $requestingTenantId, bool $isPlatformAdmin = false): array
    {
        $rfq = Rfq::withoutGlobalScopes()->findOrFail($rfqId);

        // إذا لم يكن مسؤول المنصة المركزي
        if (!$isPlatformAdmin) {
            // صاحب الطلب يملك حق الوصول دائماً
            if ($rfq->tenant_id !== $requestingTenantId) {
                // مزود الخدمة يمكنه الوصول فقط إذا كان الطلب منشوراً
                if (!in_array($rfq->status, ['published', 'open'], true)) {
                    throw new InvalidArgumentException('غير مصرح بالوصول إلى مرفقات هذا الطلب.');
                }
            }
        }

        $attachments = is_array($rfq->attachments) ? $rfq->attachments : [];
        $target = null;
        foreach ($attachments as $att) {
            if ($att['id'] === $attachmentId) {
                $target = $att;
                break;
            }
        }

        if (!$target || empty($target['storage_path']) || !Storage::disk('local')->exists($target['storage_path'])) {
            throw new InvalidArgumentException('الملف المرفق غير موجود على الخادم.');
        }

        return [
            'full_path' => Storage::disk('local')->path($target['storage_path']),
            'storage_path' => $target['storage_path'],
            'mime_type' => $target['mime_type'] ?? 'application/octet-stream',
            'filename' => $target['name'] ?? 'attachment',
        ];
    }

    /**
     * حجب وتطهير البيانات الحساسة (عناوين، هواتف) عند عرض الطلب لمقدمي الخدمة في السوق
     */
    public function maskPrivateDetails(Rfq $rfq, ?string $requestingTenantId = null): array
    {
        $data = $rfq->toArray();

        // إخفاء مسار التخزين الداخلي من كافة المرفقات في كل الحالات
        if (!empty($data['attachments']) && is_array($data['attachments'])) {
            foreach ($data['attachments'] as &$att) {
                unset($att['storage_path']);
            }
        }

        $isOwner = $requestingTenantId && $rfq->tenant_id === $requestingTenantId;
        $data['is_owner'] = (bool) $isOwner;

        // إذا كان المتصفح ليس صاحب الطلب (مثلاً ورشة تتصفح السوق)
        if (!$isOwner) {
            // حجب العناوين الدقيقة للالتقاط والتسليم وإبقاء المحافظة والمدينة فقط
            if (!empty($data['logistics']) && is_array($data['logistics'])) {
                $data['logistics']['pickup_address_private'] = null;
                $data['logistics']['delivery_address_private'] = null;
                $data['logistics']['pickup_contact_phone'] = null;
                $data['logistics']['delivery_contact_phone'] = null;
            }

            // حجب الهاتف واسم المسؤول في بيانات التنت
            if (!empty($data['tenant']) && is_array($data['tenant'])) {
                unset($data['tenant']['phone']);
                unset($data['tenant']['email']);
                unset($data['tenant']['settings']);
            }
        }

        return $data;
    }

    /**
     * استعراض طلبات عروض الأسعار المطروحة في السوق الصناعي
     */
    public function listRfqs(array $filters = [], int $perPage = 15, ?string $requestingTenantId = null): LengthAwarePaginator
    {
        $query = Rfq::query()->with(['tenant', 'bids.workshop', 'garmentModel']);

        // إذا كان المستعلم يطلب سجلاته التاريخية الخاصة
        if (!empty($filters['my_history']) || (!empty($filters['tenant_id']) && $requestingTenantId && $filters['tenant_id'] === $requestingTenantId)) {
            $query->where('tenant_id', $requestingTenantId ?? $filters['tenant_id']);
        } else {
            // في سوق العروض العام: تظهر فقط الطلبات المنشورة (المسودات محجوبة تماماً عن مقدمي الخدمة)
            $query->whereIn('status', ['published', 'open']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['service_type'])) {
            $query->where('service_type', $filters['service_type']);
        }

        if (!empty($filters['search'])) {
            $s = $filters['search'];
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")
                  ->orWhere('rfq_number', 'like', "%{$s}%")
                  ->orWhere('model_name', 'like', "%{$s}%")
                  ->orWhere('specifications', 'like', "%{$s}%");
            });
        }

        $paginator = $query->latest()->paginate($perPage);

        // تطهير البيانات الخاصة للطلبات التي لا يملكها المتصفح
        $paginator->getCollection()->transform(function (Rfq $rfq) use ($requestingTenantId) {
            return (object) $this->maskPrivateDetails($rfq, $requestingTenantId);
        });

        return $paginator;
    }

    /**
     * تقديم عرض سعر من ورشة لطلب تصنيع (Submit Bid)
     */
    public function submitBid(string $rfqId, string $workshopProfileId, array $data): RfqBid
    {
        return DB::transaction(function () use ($rfqId, $workshopProfileId, $data) {
            $rfq = Rfq::withoutGlobalScopes()->findOrFail($rfqId);

            if (!in_array($rfq->status, ['open', 'published'], true)) {
                throw new InvalidArgumentException('طلب عروض الأسعار غير متاح لاستقبال عروض جديدة (مغلق أو تم ترسيته مسبقاً).');
            }

            $workshop = WorkshopProfile::findOrFail($workshopProfileId);

            // التحقق الصارم من توثيق ملف الورشة (Stage C.6: Verified Workshop Requirement)
            if (!$workshop->is_verified) {
                throw new \Symfony\Component\HttpKernel\Exception\HttpException(403, 'ملف ورشة التصنيع قيد المراجعة الإدارية وغير موثق حالياً (WorkshopNotVerified).');
            }

            // التحقق من أن الورشة تتبع نفس المستأجر المصرح له (عند استدعائها عبر سياق مستأجر محدد)
            $callerTenantId = $data['tenant_id'] ?? (auth()->check() ? auth()->user()->tenant_id : null);
            if ($callerTenantId && $workshop->tenant_id !== $callerTenantId) {
                throw new \Symfony\Component\HttpKernel\Exception\HttpException(403, 'لا يمكنك تقديم عرض سعر نيابة عن ورشة لا تتبع مصنعك.');
            }

            // منع التنافس الذاتي: لا يمكن للورشة المزايدة على طلب لنفس المستأجر (Self-Bidding Prevention)
            if ($workshop->tenant_id === $rfq->tenant_id) {
                throw new \Symfony\Component\HttpKernel\Exception\HttpException(403, 'لا يمكنك تقديم عرض سعر على طلب القص الخاص بمصنعك (SelfBiddingForbidden).');
            }

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

            if (!in_array($rfq->status, ['open', 'published'], true)) {
                throw new InvalidArgumentException('لا يمكن قبول عرض على طلب غير مفتوح.');
            }

            $bid = RfqBid::where('rfq_id', $rfq->id)->findOrFail($bidId);
            $workshop = WorkshopProfile::findOrFail($bid->workshop_profile_id);

            // ترقية العرض الفائز ورفض العروض الأخرى وتعيين حالة اختيار العرض (P3: Offer Selected Lifecycle)
            $bid->status = 'accepted';
            $rfq->awarded_bid_id = $bid->id;
            $rfq->status = 'offer_selected';
            if (\Illuminate\Support\Facades\Schema::hasColumn('rfqs', 'selected_at')) {
                $rfq->selected_at = now();
            }

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

    /**
     * تحديث الحالة التشغيلية لطلب القص بعد اختيار العرض (P3 & P4: Operation Status Tracking)
     * الحالات المسموحة: offer_selected -> in_progress -> delivered -> completed / cancelled
     */
    public function updateOperationStatus(string $rfqId, string $newStatus, string $actorTenantId, ?string $notes = null, bool $isAdmin = false): array
    {
        $validStatuses = ['offer_selected', 'awarded', 'in_progress', 'delivered', 'completed', 'cancelled'];
        if (!in_array($newStatus, $validStatuses, true)) {
            throw new InvalidArgumentException("الحالة التشغيلية المطلوبة ({$newStatus}) غير مدعومة.");
        }

        return DB::transaction(function () use ($rfqId, $newStatus, $actorTenantId, $notes, $isAdmin) {
            $rfq = Rfq::withoutGlobalScopes()->with(['awardedBid.workshop'])->lockForUpdate()->findOrFail($rfqId);

            $isOwner = $rfq->tenant_id === $actorTenantId;
            $isSelectedProvider = $rfq->awardedBid && $rfq->awardedBid->workshop && $rfq->awardedBid->workshop->tenant_id === $actorTenantId;

            if (!$isAdmin && !$isOwner && !$isSelectedProvider) {
                throw new \Symfony\Component\HttpKernel\Exception\HttpException(403, 'غير مصرح لك بتحديث حالة هذه العملية التشغيلية.');
            }

            // التحقق من قواعد الانتقال بين الحالات حسب هوية الفاعل
            if (!$isAdmin) {
                if ($isSelectedProvider) {
                    // المصنع المنفذ يمكنه فقط: بدء القص in_progress، أو تسجيل التسليم delivered
                    if (!in_array($newStatus, ['in_progress', 'delivered'], true)) {
                        throw new InvalidArgumentException('المصنع المنفذ مصرح له فقط ببدء التشغيل (in_progress) أو إثبات التسليم (delivered).');
                    }
                    if ($newStatus === 'in_progress' && !in_array($rfq->status, ['offer_selected', 'awarded'], true)) {
                        throw new InvalidArgumentException('لا يمكن بدء التشغيل إلا بعد اختيار العرض.');
                    }
                    if ($newStatus === 'delivered' && !in_array($rfq->status, ['in_progress', 'offer_selected', 'awarded'], true)) {
                        throw new InvalidArgumentException('لا يمكن إثبات التسليم للطلب في حالته الحالية.');
                    }
                } elseif ($isOwner) {
                    // طالب الخدمة يمكنه فقط: تأكيد استلام الطلب completed، أو الإلغاء cancelled قبل التسليم
                    if (!in_array($newStatus, ['completed', 'cancelled'], true)) {
                        throw new InvalidArgumentException('صاحب الطلب مصرح له فقط بتأكيد الإتمام (completed) أو الإلغاء (cancelled).');
                    }
                    if ($newStatus === 'completed' && !in_array($rfq->status, ['delivered', 'in_progress'], true)) {
                        throw new InvalidArgumentException('لا يمكن تأكيد إتمام واستلام الطلب قبل تسليمه من قبل الورشة.');
                    }
                    if ($newStatus === 'cancelled' && in_array($rfq->status, ['delivered', 'completed'], true)) {
                        throw new InvalidArgumentException('لا يمكن إلغاء طلب تم تسليمه أو إكماله بالفعل.');
                    }
                }
            }

            $oldStatus = $rfq->status;
            $rfq->status = $newStatus;

            $logistics = is_array($rfq->logistics) ? $rfq->logistics : [];
            $logistics['operation_history'][] = [
                'from_status' => $oldStatus,
                'to_status' => $newStatus,
                'updated_by_tenant' => $actorTenantId,
                'updated_at' => now()->toIso8601String(),
                'notes' => $notes,
            ];
            $rfq->logistics = $logistics;
            $rfq->save();

            return [
                'rfq_id' => $rfq->id,
                'previous_status' => $oldStatus,
                'current_status' => $rfq->status,
                'notes' => $notes,
                'updated_at' => now()->toIso8601String(),
            ];
        });
    }

    /**
     * استعراض العروض المقدمة من مصنع/ورش المستأجر الحالي (P4: My Submitted Offers)
     */
    public function listMyBids(string $tenantId): array
    {
        $workshopIds = WorkshopProfile::where('tenant_id', $tenantId)->pluck('id');

        $bids = RfqBid::withoutGlobalScopes()
            ->whereIn('workshop_profile_id', $workshopIds)
            ->with(['rfq.garmentModel', 'workshop'])
            ->latest()
            ->get();

        return $bids->map(function (RfqBid $bid) use ($tenantId) {
            $rfq = $bid->rfq;
            $isWinning = $bid->status === 'accepted' || ($rfq && $rfq->awarded_bid_id === $bid->id);
            $hasLost = $rfq && in_array($rfq->status, ['offer_selected', 'awarded', 'in_progress', 'delivered', 'completed'], true) && !$isWinning;
            $canWithdraw = $bid->status === 'submitted' && $rfq && in_array($rfq->status, ['open', 'published'], true);

            return [
                'id' => $bid->id,
                'rfq_id' => $bid->rfq_id,
                'rfq_title' => $rfq?->title ?? 'طلب قص',
                'rfq_number' => $rfq?->rfq_number ?? '',
                'rfq_status' => $rfq?->status ?? 'open',
                'target_quantity' => $rfq?->target_quantity ?? 0,
                'expected_delivery_date' => $rfq?->expected_delivery_date?->toDateString(),
                'workshop_name' => $bid->workshop?->workshop_name ?? '',
                'unit_rate' => (float) $bid->unit_rate,
                'total_amount' => round((float) $bid->unit_rate * (int) ($rfq?->target_quantity ?? 1), 2),
                'promised_lead_days' => (int) $bid->promised_lead_days,
                'notes' => $bid->notes,
                'status' => $bid->status,
                'is_winner' => $isWinning,
                'lost_to_another' => $hasLost,
                'can_withdraw' => $canWithdraw,
                'created_at' => $bid->created_at?->toIso8601String(),
            ];
        })->toArray();
    }

    /**
     * سحب عرض سعر مقدم من قبل المصنع قبل اختياره (P4: Withdraw Bid)
     */
    public function withdrawBid(string $bidId, string $tenantId): bool
    {
        $bid = RfqBid::withoutGlobalScopes()->with(['workshop', 'rfq'])->findOrFail($bidId);

        if (!$bid->workshop || $bid->workshop->tenant_id !== $tenantId) {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(403, 'غير مصرح لك بسحب هذا العرض.');
        }

        if ($bid->status !== 'submitted') {
            throw new InvalidArgumentException('لا يمكن سحب عرض تمت معالجته أو سحبه مسبقاً.');
        }

        if (!$bid->rfq || !in_array($bid->rfq->status, ['open', 'published'], true)) {
            throw new InvalidArgumentException('لا يمكن سحب العرض بعد إغلاق الطلب أو ترسيته.');
        }

        $bid->status = 'withdrawn';
        $bid->save();

        return true;
    }

    /**
     * استعراض العمليات الجارية المسندة للورشة بعد الفوز بالعرض (P4: My Selected Operations)
     */
    public function listMyOperations(string $tenantId): array
    {
        $workshopIds = WorkshopProfile::where('tenant_id', $tenantId)->pluck('id');

        $rfqs = Rfq::withoutGlobalScopes()
            ->whereHas('awardedBid', fn ($q) => $q->whereIn('workshop_profile_id', $workshopIds))
            ->with(['awardedBid.workshop', 'garmentModel'])
            ->latest('updated_at')
            ->get();

        return $rfqs->map(function (Rfq $rfq) {
            $bid = $rfq->awardedBid;
            $unitRate = $bid ? (float) $bid->unit_rate : 0.0;
            $totalPrice = round($unitRate * (int) $rfq->target_quantity, 2);

            return [
                'id' => $rfq->id,
                'rfq_number' => $rfq->rfq_number,
                'title' => $rfq->title,
                'service_type' => $rfq->service_type,
                'target_quantity' => (int) $rfq->target_quantity,
                'status' => $rfq->status,
                'operation_status' => $rfq->status,
                'expected_delivery_date' => $rfq->expected_delivery_date?->toDateString(),
                'fabric_details' => $rfq->fabric_details,
                'production_details' => $rfq->production_details,
                'specifications' => $rfq->specifications,
                'workshop_name' => $bid?->workshop?->workshop_name ?? '',
                'unit_rate' => $unitRate,
                'agreed_total_price' => $totalPrice,
                'selected_at' => $rfq->selected_at?->toIso8601String() ?? $rfq->updated_at?->toIso8601String(),
                'notes' => $rfq->notes,
                'logistics_summary' => [
                    'pickup_governorate' => $rfq->logistics['pickup_governorate'] ?? null,
                    'delivery_governorate' => $rfq->logistics['delivery_governorate'] ?? null,
                ],
            ];
        })->toArray();
    }
}

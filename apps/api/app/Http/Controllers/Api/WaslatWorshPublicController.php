<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Rfq;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WaslatWorshPublicController extends Controller
{
    /**
     * استعراض طلبات القص المنشورة علنياً للزوار العامين (Public-Safe RFQ Listing)
     * مع تطبيق قائمة حقول بيضاء صارمة وحجب كامل للبيانات الحساسة
     */
    public function index(Request $request): JsonResponse
    {
        $query = Rfq::withoutGlobalScopes()
            ->whereIn('status', ['published', 'open']);

        // فلترة اختيارية حسب تخصص الخدمة (الافتراضي قص cutting)
        if ($request->filled('service_type')) {
            $query->where('service_type', $request->query('service_type'));
        }

        // فلترة حسب فئة المنتج
        if ($request->filled('category')) {
            $query->where('garment_category', $request->query('category'));
        }

        // بحث نصي آمن في العنوان أو الموديل
        if ($request->filled('search')) {
            $search = '%' . trim($request->query('search')) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', $search)
                  ->orWhere('model_name', 'like', $search);
            });
        }

        $perPage = min((int) ($request->query('per_page', 12)), 36);
        $paginator = $query->orderBy('published_at', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        $transformed = $paginator->getCollection()->map(function (Rfq $rfq) {
            return $this->formatPublicRfqSummary($rfq);
        });

        return response()->json([
            'data' => $transformed,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /**
     * استعراض تفاصيل طلب قص منشور علنياً مع حجب الخصوصية الصارم (Public-Safe RFQ Detail)
     */
    public function show(string $id): JsonResponse
    {
        $rfq = Rfq::withoutGlobalScopes()
            ->where('id', $id)
            ->first();

        // حظر تام لعرض المسودات والطلبات الملغاة لغير المالك المسجل
        if (!$rfq || !in_array($rfq->status, ['published', 'open'], true)) {
            return response()->json([
                'message' => 'طلب التشغيل المطلوب غير متاح في العرض العام أو لم يتم نشره بعد.',
                'error' => 'NOT_FOUND',
            ], 404);
        }

        return response()->json([
            'rfq' => $this->formatPublicRfqDetail($rfq),
        ]);
    }

    /**
     * إحصائيات ونبض حيوية السوق الحقيقية دون أرقام وهمية (Real Marketplace Metrics)
     */
    public function metrics(): JsonResponse
    {
        $baseQuery = Rfq::withoutGlobalScopes()->whereIn('status', ['published', 'open']);

        $activeCount = (clone $baseQuery)->count();
        $totalPieces = (int) (clone $baseQuery)->sum('target_quantity');

        // حساب عدد المحافظات المشمولة في طلبات القص النشطة
        $activeRfqs = (clone $baseQuery)->select(['logistics', 'garment_category'])->get();
        $governorates = [];
        $categories = [];

        foreach ($activeRfqs as $r) {
            $logistics = $r->logistics;
            if (is_array($logistics)) {
                if (!empty($logistics['pickup_governorate'])) {
                    $governorates[trim($logistics['pickup_governorate'])] = true;
                }
                if (!empty($logistics['delivery_governorate'])) {
                    $governorates[trim($logistics['delivery_governorate'])] = true;
                }
            }
            if (!empty($r->garment_category)) {
                $categories[trim($r->garment_category)] = true;
            }
        }

        return response()->json([
            'active_rfqs_count' => $activeCount,
            'total_target_pieces' => $totalPieces,
            'governorates_count' => count($governorates),
            'categories_count' => count($categories),
            'currency' => 'EGP',
            'updated_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * تشكيل الملخص العام للطلب طبقاً للقائمة البيضاء المعتمدة
     */
    private function formatPublicRfqSummary(Rfq $rfq): array
    {
        $fabric = is_array($rfq->fabric_details) ? $rfq->fabric_details : [];
        $production = is_array($rfq->production_details) ? $rfq->production_details : [];
        $logistics = is_array($rfq->logistics) ? $rfq->logistics : [];
        $attachments = is_array($rfq->attachments) ? $rfq->attachments : [];

        // مؤشرات المرفقات بدون روابط تحميل
        $attachmentTypes = [];
        foreach ($attachments as $att) {
            if (!empty($att['file_type'])) {
                $attachmentTypes[] = $att['file_type'];
            }
        }

        return [
            'id' => $rfq->id,
            'rfq_number' => $rfq->rfq_number,
            'title' => $rfq->title,
            'model_name' => $rfq->model_name,
            'garment_category' => $rfq->garment_category ?? 'men',
            'service_type' => $rfq->service_type,
            'priority' => $rfq->priority ?? 'normal',
            'target_quantity' => (int) $rfq->target_quantity,
            'expected_delivery_date' => $rfq->expected_delivery_date,
            'max_budget_per_piece' => $rfq->max_budget_per_piece ? (float) $rfq->max_budget_per_piece : null,
            'fabric_summary' => [
                'fabric_type' => $fabric['fabric_type'] ?? null,
                'fabric_weight_gsm' => isset($fabric['fabric_weight_gsm']) ? (int) $fabric['fabric_weight_gsm'] : null,
                'fabric_width_cm' => isset($fabric['fabric_width_cm']) ? (int) $fabric['fabric_width_cm'] : null,
                'fabric_supplied_by_requester' => $fabric['fabric_supplied_by_requester'] ?? true,
            ],
            'cutting_summary' => [
                'cutting_machine_preference' => $production['cutting_machine_preference'] ?? null,
                'layers_per_spread' => isset($production['layers_per_spread']) ? (int) $production['layers_per_spread'] : null,
                'marker_provided' => $production['marker_provided'] ?? true,
                'sizes_count' => !empty($production['size_breakdown']) && is_array($production['size_breakdown']) ? count($production['size_breakdown']) : 0,
                'colors_count' => !empty($production['color_breakdown']) && is_array($production['color_breakdown']) ? count($production['color_breakdown']) : 0,
            ],
            'location' => [
                'pickup_governorate' => $logistics['pickup_governorate'] ?? 'القاهرة',
                'pickup_city' => $logistics['pickup_city'] ?? null,
                'delivery_governorate' => $logistics['delivery_governorate'] ?? null,
                'delivery_city' => $logistics['delivery_city'] ?? null,
                'transport_responsibility' => $logistics['transport_responsibility'] ?? 'provider',
            ],
            'attachments_indicator' => [
                'has_attachments' => count($attachments) > 0,
                'count' => count($attachments),
                'types' => array_values(array_unique($attachmentTypes)),
            ],
            'status' => 'published',
            'published_at' => $rfq->published_at ? $rfq->published_at->toIso8601String() : $rfq->created_at->toIso8601String(),
        ];
    }

    /**
     * تشكيل التفاصيل الكاملة الآمنة للطلب المنشور
     */
    private function formatPublicRfqDetail(Rfq $rfq): array
    {
        $summary = $this->formatPublicRfqSummary($rfq);
        $fabric = is_array($rfq->fabric_details) ? $rfq->fabric_details : [];
        $production = is_array($rfq->production_details) ? $rfq->production_details : [];

        // إضافة التفاصيل الفنية المصرح بعرضها علناً
        $summary['specifications'] = $rfq->specifications;

        $summary['fabric_details_public'] = [
            'fabric_type' => $fabric['fabric_type'] ?? null,
            'fabric_composition' => $fabric['fabric_composition'] ?? null,
            'fabric_width_cm' => isset($fabric['fabric_width_cm']) ? (int) $fabric['fabric_width_cm'] : null,
            'fabric_weight_gsm' => isset($fabric['fabric_weight_gsm']) ? (int) $fabric['fabric_weight_gsm'] : null,
            'fabric_quantity' => isset($fabric['fabric_quantity']) ? (float) $fabric['fabric_quantity'] : null,
            'fabric_unit' => $fabric['fabric_unit'] ?? 'kg',
            'fabric_supplied_by_requester' => $fabric['fabric_supplied_by_requester'] ?? true,
            'fabric_notes' => $fabric['fabric_notes'] ?? null,
        ];

        $summary['production_details_public'] = [
            'cutting_machine_preference' => $production['cutting_machine_preference'] ?? 'cnc_automatic',
            'layers_per_spread' => isset($production['layers_per_spread']) ? (int) $production['layers_per_spread'] : null,
            'marker_provided' => $production['marker_provided'] ?? true,
            'sample_approved' => $production['sample_approved'] ?? true,
            'size_breakdown' => $production['size_breakdown'] ?? null,
            'color_breakdown' => $production['color_breakdown'] ?? null,
            'special_cutting_instructions' => $production['special_cutting_instructions'] ?? null,
        ];

        $summary['attachments_indicator']['notice'] = 'الملفات الفنية والباترونات مشفرة ومتاحة للتحميل فقط للمشتركين المعتمدين في باقة Enterprise بعد تسجيل الدخول.';

        return $summary;
    }
}


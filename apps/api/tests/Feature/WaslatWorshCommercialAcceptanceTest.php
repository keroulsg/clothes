<?php

namespace Tests\Feature;

use App\Models\ChartOfAccount;
use App\Models\JobOrder;
use App\Models\MarketplaceCommission;
use App\Models\Rfq;
use App\Models\RfqBid;
use App\Models\Tenant;
use App\Models\User;
use App\Models\WorkshopProfile;
use App\Models\WorkshopReview;
use App\Services\AccountingService;
use App\Services\SubscriptionUsageService;
use App\Services\WaslatWorshService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WaslatWorshCommercialAcceptanceTest extends TestCase
{
    use RefreshDatabase;

    private WaslatWorshService $wwService;
    private AccountingService $accountingService;
    private Tenant $providerTenant;
    private Tenant $seekerTenant;
    private Tenant $intruderTenant;
    private User $providerUser;
    private User $seekerUser;

    protected function setUp(): void
    {
        parent::setUp();

        $subService = app(SubscriptionUsageService::class);
        $subService->seedDefaultPlans();

        $this->wwService = app(WaslatWorshService::class);
        $this->accountingService = app(AccountingService::class);

        // 1. مزود الخدمة (الورشة الصناعية) - مؤهل في باقة Enterprise بحسب ADR-029
        $this->providerTenant = Tenant::create([
            'code' => 'T-PROVIDER-01',
            'name' => 'ورشة الأمل للخياطة والتطريز',
            'domain' => 'alamal-workshop.garmentos.test',
            'status' => 'active',
            'plan_tier' => 'enterprise',
        ]);
        $subService->upgradeSubscription($this->providerTenant->id, 'enterprise');

        $this->providerUser = User::create([
            'tenant_id' => $this->providerTenant->id,
            'name' => 'الأسطى محمود المعلم',
            'email' => 'osta.mahmoud@alamal.test',
            'password' => bcrypt('Secret123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        // 2. طالب الخدمة (المصنع التجاري) - مؤهل في باقة Enterprise بحسب ADR-029
        $this->seekerTenant = Tenant::create([
            'code' => 'T-SEEKER-01',
            'name' => 'شركة النصر لصناعة الملابس الجاهزة',
            'domain' => 'elnasr-apparel.garmentos.test',
            'status' => 'active',
            'plan_tier' => 'enterprise',
        ]);
        $subService->upgradeSubscription($this->seekerTenant->id, 'enterprise');

        $this->seekerUser = User::create([
            'tenant_id' => $this->seekerTenant->id,
            'name' => 'م. أحمد مدير الإنتاج',
            'email' => 'ahmed.prod@elnasr.test',
            'password' => bcrypt('Secret123!'),
            'role' => 'production_manager',
            'is_active' => true,
        ]);

        // 3. مستأجر دخيل لفحص العزل
        $this->intruderTenant = Tenant::create([
            'code' => 'T-INTRUDER-99',
            'name' => 'مصنع منافس غريب',
            'domain' => 'intruder.garmentos.test',
            'status' => 'active',
        ]);
    }

    /**
     * اختبار المسار التجاري الكامل لمنصة وصلة ورش
     */
    public function test_complete_waslat_worsh_b2b_lifecycle_and_cmt_conversion(): void
    {
        // 1. تسجيل وإكمال ملف الورشة
        $workshopProfile = $this->wwService->createWorkshopProfile([
            'tenant_id' => $this->providerTenant->id,
            'workshop_name' => 'ورشة الأمل المتخصصة',
            'specialty_type' => 'full_cmt',
            'active_machines_count' => 25,
            'daily_capacity_pieces' => 500,
            'governorate' => 'الغربية',
            'city' => 'المحلة الكبرى',
            'address' => 'شارع الإنتاج الصناعي، المحلة',
            'phone' => '01012345678',
            'contact_person' => 'الأسطى محمود',
            'is_verified' => true,
        ]);

        $this->assertNotNull($workshopProfile->id);
        $this->assertEquals('الغربية', $workshopProfile->governorate);
        $this->assertEquals(500, $workshopProfile->daily_capacity_pieces);

        // 2. طرح طلب عرض سعر (RFQ) من المصنع الباحث
        $rfq = $this->wwService->createRfq($this->seekerTenant->id, [
            'title' => 'تشغيل وخياطة 1,000 تيشيرت بولو قطن 100%',
            'service_type' => 'full_cmt',
            'specifications' => 'قص وخياطة مع تركيب ياقة بولو مضلعة وتطريز الشعار على الصدر الأيسر',
            'target_quantity' => 1000,
            'expected_delivery_date' => now()->addDays(14)->toDateString(),
            'max_budget_per_piece' => 45.00,
            'fabric_responsibility' => 'seeker_provided',
        ]);

        $this->assertNotNull($rfq->id);
        $this->assertStringStartsWith('RFQ-', $rfq->rfq_number);
        $this->assertEquals('open', $rfq->status);

        // 3. تقديم عرض سعر من ورشة الأمل
        $bid = $this->wwService->submitBid($rfq->id, $workshopProfile->id, [
            'unit_rate' => 38.50,
            'promised_lead_days' => 10,
            'notes' => 'جاهزون لاستلام الأقمشة وقصها فوراً، السعر يشمل الخيوط والتعبئة',
        ]);

        $this->assertNotNull($bid->id);
        $this->assertEquals(38.50, $bid->unit_rate);
        $this->assertEquals('submitted', $bid->status);

        // 4. محاولة تقديم عرض مكرر من نفس الورشة يجب أن ترفض
        $this->expectException(\InvalidArgumentException::class);
        $this->wwService->submitBid($rfq->id, $workshopProfile->id, [
            'unit_rate' => 37.00,
            'promised_lead_days' => 8,
        ]);
    }

    /**
     * اختبار الترسية والتحويل إلى أمر تشغيل JobOrder واحتساب العمولة
     */
    public function test_bid_award_converts_to_erp_job_order_and_calculates_commission(): void
    {
        $workshopProfile = $this->wwService->createWorkshopProfile([
            'tenant_id' => $this->providerTenant->id,
            'workshop_name' => 'ورشة الأمل المتخصصة',
            'specialty_type' => 'full_cmt',
            'active_machines_count' => 20,
            'daily_capacity_pieces' => 400,
            'governorate' => 'القاهرة',
            'phone' => '01011122233',
            'contact_person' => 'الأسطى محمود',
        ]);

        $rfq = $this->wwService->createRfq($this->seekerTenant->id, [
            'title' => 'تشغيل 2000 قطعة قميص رجالي كلاسيك',
            'service_type' => 'full_cmt',
            'specifications' => 'قميص أكسفورد أكمام طويلة',
            'target_quantity' => 2000,
            'expected_delivery_date' => now()->addDays(20)->toDateString(),
            'max_budget_per_piece' => 60.00,
        ]);

        $bid = $this->wwService->submitBid($rfq->id, $workshopProfile->id, [
            'unit_rate' => 50.00,
            'promised_lead_days' => 15,
        ]);

        // ترسية العرض
        $awardResult = $this->wwService->acceptBid($rfq->id, $bid->id, $this->seekerTenant->id);

        $this->assertContains($awardResult['rfq']->status, ['awarded', 'offer_selected']);
        $this->assertEquals('accepted', $awardResult['awarded_bid']->status);

        // التحقق من إنشاء أمر التشغيل داخل الـ ERP للشركة الباحثة
        $jobOrder = $awardResult['job_order'];
        $this->assertInstanceOf(JobOrder::class, $jobOrder);
        $this->assertEquals($this->seekerTenant->id, $jobOrder->tenant_id);
        $this->assertEquals(2000, $jobOrder->total_target_quantity);
        $this->assertEquals(50.00, $jobOrder->unit_rate);

        // التحقق من احتساب العمولة (3%)
        // الإجمالي = 2,000 * 50 = 100,000 ج.م
        // العمولة 3% = 3,000 ج.م
        $commission = $awardResult['commission'];
        $this->assertInstanceOf(MarketplaceCommission::class, $commission);
        $this->assertEquals(100000.00, (float) $commission->gross_amount);
        $this->assertEquals(3.00, (float) $commission->commission_rate);
        $this->assertEquals(3000.00, (float) $commission->commission_amount);
        $this->assertEquals('pending', $commission->status);

        // التحقق من ترابط السجلات: RFQ -> Bid -> JobOrder -> Commission
        $this->assertEquals($rfq->id, $commission->rfq_id);
        $this->assertEquals($bid->id, $commission->rfq_bid_id);
        $this->assertEquals($jobOrder->id, $commission->job_order_id);
    }

    /**
     * اختبار المعالجة المحاسبية الكاملة وتوازن قيد اليومية
     */
    public function test_marketplace_accounting_journal_balanced_double_entry(): void
    {
        app()->instance('current_tenant_id', $this->seekerTenant->id);
        $this->accountingService->initializeDefaultChartOfAccounts($this->seekerTenant->id);

        // الحسابات:
        // 5030: مصاريف تشغيل صناعي خارجي (مدين بـ 100,000 ج.م)
        // 2010: الموردون والدائنون التجاريون - مستحق الورشة (دائن بـ 97,000 ج.م)
        // 4020: إيراد عمولة منصة وصلة ورش 3% (دائن بـ 3,000 ج.م)

        $accExpense = ChartOfAccount::where('tenant_id', $this->seekerTenant->id)->where('code', '5030')->firstOrFail();
        $accPayable = ChartOfAccount::where('tenant_id', $this->seekerTenant->id)->where('code', '2010')->firstOrFail();
        $accRevenue = ChartOfAccount::where('tenant_id', $this->seekerTenant->id)->where('code', '4020')->firstOrFail();

        $journal = $this->accountingService->createJournalEntry([
            'entry_number' => 'JV-WW-' . time(),
            'entry_date' => now()->toDateString(),
            'description' => 'استحقاق أمر تشغيل خارجي لورشة الأمل عبر منصة وصلة ورش مع استقطاع عمولة المنصة 3%',
            'lines' => [
                [
                    'account_id' => $accExpense->id,
                    'debit' => 100000.00,
                    'credit' => 0.00,
                    'description' => 'إجمالي تكلفة التشغيل الخارجي (2,000 قميص)',
                ],
                [
                    'account_id' => $accPayable->id,
                    'debit' => 0.00,
                    'credit' => 97000.00,
                    'description' => 'صافي مستحق ورشة الأمل بعد خصم عمولة المنصة',
                ],
                [
                    'account_id' => $accRevenue->id,
                    'debit' => 0.00,
                    'credit' => 3000.00,
                    'description' => 'عمولة وساطة منصة وصلة ورش 3%',
                ],
            ],
        ]);

        $this->assertNotNull($journal->id);
        $this->assertEquals(100000.00, (float) $journal->total_debit);
        $this->assertEquals(100000.00, (float) $journal->total_credit);
        $this->assertEquals(0, bccomp((string) $journal->total_debit, (string) $journal->total_credit, 2));
    }

    /**
     * اختبار تقييم الورشة وتحديث السمعة
     */
    public function test_workshop_rating_and_reputation_scoring(): void
    {
        $workshopProfile = $this->wwService->createWorkshopProfile([
            'tenant_id' => $this->providerTenant->id,
            'workshop_name' => 'ورشة النجوم للخياطة',
            'phone' => '01099887766',
            'contact_person' => 'عماد',
        ]);

        $rfq = $this->wwService->createRfq($this->seekerTenant->id, [
            'title' => 'تشغيل بنطلون جبردين',
            'specifications' => 'جيوب جانبية وخياطة مزدوجة',
            'target_quantity' => 500,
            'expected_delivery_date' => now()->addDays(7)->toDateString(),
        ]);

        // تقديم تقييم: الجودة 5، الالتزام بالموعد 4، التواصل 5 -> المتوسط (5+4+5)/3 = 4.67
        $review = $this->wwService->submitReview([
            'rfq_id' => $rfq->id,
            'workshop_profile_id' => $workshopProfile->id,
            'reviewer_tenant_id' => $this->seekerTenant->id,
            'quality_rating' => 5,
            'timeliness_rating' => 4,
            'communication_rating' => 5,
            'review_notes' => 'التزام رائع بجودة التشغيل والتطريز النظيف، والتسليم في الموعد.',
        ]);

        $workshopProfile->refresh();
        $this->assertEquals(4.67, (float) $workshopProfile->rating_average);
        $this->assertEquals(1, $workshopProfile->completed_jobs_count);
    }
}


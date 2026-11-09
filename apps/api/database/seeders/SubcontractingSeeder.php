<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\CustomerMaterial;
use App\Models\CustomerMaterialReceipt;
use App\Models\Employee;
use App\Models\ExternalOperation;
use App\Models\JobDeliveryNote;
use App\Models\JobInvoice;
use App\Models\JobOrder;
use App\Models\PieceWorkLog;
use App\Models\Tenant;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class SubcontractingSeeder extends Seeder
{
    public function run(): void
    {
        $targetTenants = Tenant::pluck('id')->toArray();

        foreach ($targetTenants as $tenantId) {
            $tenant = Tenant::find($tenantId);
            if (!$tenant) continue;

            $warehouse = Warehouse::withoutGlobalScopes()->where('tenant_id', $tenantId)->first();
            if (!$warehouse) {
                $warehouse = Warehouse::create([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $tenantId,
                    'code' => 'WH-MAIN',
                    'name' => 'المستودع الرئيسي وأمانات التشغيل',
                    'type' => 'raw_materials',
                    'is_active' => true,
                ]);
            }

            $empCutter = Employee::withoutGlobalScopes()->where('tenant_id', $tenantId)->first();
            if (!$empCutter) {
                $empCutter = Employee::create([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $tenantId,
                    'employee_code' => 'EMP-101',
                    'name' => 'محمود السيد عبد الرحيم',
                    'job_title' => 'فني مقصدار رئيسي (Master Cutter)',
                    'department' => 'cutting',
                    'pay_type' => 'fixed_salary',
                    'base_salary' => 8500,
                    'status' => 'active',
                    'hire_date' => '2025-01-15',
                ]);
            }

            $customersData = [
                [
                    'name' => 'شركة النيل للملابس الجاهزة واليونيفورم',
                    'code' => 'CUST-101',
                    'contact_person' => 'أ. طارق الشناوي (مدير المشتريات والتعاقدات)',
                    'phone' => '01012345678',
                    'email' => 'nile.uniforms@example.com',
                    'tax_id' => '100-294-811',
                    'payment_terms' => 'installments',
                    'credit_limit' => 150000,
                    'notes' => 'نظام التعاقد: دفعات مجدولة (30% مقدم، 40% دفعة أولى، 30% بعد الاستلام).',
                    'address' => 'المنطقة الصناعية الثالثة - السادس من أكتوبر',
                ],
                [
                    'name' => 'مؤسسة الأهرام فاشون وتجارة الأقمشة',
                    'code' => 'CUST-102',
                    'contact_person' => 'م. حسام البدري (المدير التنفيذي)',
                    'phone' => '01198765432',
                    'email' => 'ahram.fashion@example.com',
                    'tax_id' => '200-482-933',
                    'payment_terms' => 'cash',
                    'credit_limit' => 60000,
                    'notes' => 'نظام التعاقد: كاش فوري عند تسليم كل إذن مشغولات وقص.',
                    'address' => 'مدينة العبور - بلوك 12 المنطقة الصناعية الأولى',
                ],
                [
                    'name' => 'براند ريتش كيدز لملابس الأطفال العالمية',
                    'code' => 'CUST-103',
                    'contact_person' => 'أ. مينا مكرم حبيب (مدير سلاسل الإمداد)',
                    'phone' => '01234567890',
                    'email' => 'richkids.brand@example.com',
                    'tax_id' => '300-881-294',
                    'payment_terms' => 'installments',
                    'credit_limit' => 200000,
                    'notes' => 'سداد على أقساط شهرية منتظمة مع تحرير شيكات بنكية مؤجلة.',
                    'address' => 'التجمع الخامس - شارع التسعين الشمالي - مبنى كابيتال 4',
                ],
                [
                    'name' => 'مجموعة بريميم جينز إيجيبت (Premium Denim)',
                    'code' => 'CUST-104',
                    'contact_person' => 'م. مصطفى الشاذلي',
                    'phone' => '01511223344',
                    'email' => 'premium.denim@example.com',
                    'tax_id' => '400-112-984',
                    'payment_terms' => 'cash',
                    'credit_limit' => 80000,
                    'notes' => 'سداد نقدي أو تحويل فوري مع كل تسليم.',
                    'address' => 'المحلة الكبرى - طريق طنطا الزراعي',
                ],
                [
                    'name' => 'شركة الصفا للمفروشات والزي المكتبي',
                    'code' => 'CUST-105',
                    'contact_person' => 'الحاج سعيد عبد الصادق',
                    'phone' => '01099887766',
                    'email' => 'alsafa.textiles@example.com',
                    'tax_id' => '500-773-199',
                    'payment_terms' => 'installments',
                    'credit_limit' => 120000,
                    'notes' => 'تسهيلات سداد 60 يوم من تاريخ الفاتورة.',
                    'address' => 'مدينة بدر - المنطقة الصناعية المتوسطة',
                ],
            ];

            $customerModels = [];
            foreach ($customersData as $cd) {
                $c = Customer::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('name', $cd['name'])->first();
                if (!$c) {
                    $c = Customer::create(array_merge($cd, [
                        'id' => (string) Str::uuid(),
                        'tenant_id' => $tenantId,
                        'is_active' => true,
                    ]));
                } else {
                    $c->update($cd);
                }
                $customerModels[$cd['code']] = $c;
            }

            $materialsData = [
                [
                    'customer_code' => 'CUST-101',
                    'fabric_name' => 'قطن بيور ميلتون 3 فتلة معالج ضد الانكماش',
                    'fabric_code' => 'FAB-MILT-301',
                    'received_meters' => 1850.0,
                    'consumed_meters' => 1250.0,
                    'returned_meters' => 45.5,
                    'remaining_meters' => 554.5,
                    'rolls_count' => 12,
                    'receipt_number' => 'CMR-202611-1001',
                    'weight_kg' => 610.5,
                    'inspector' => 'أمين مستودع الأمانات / خالد إبراهيم',
                ],
                [
                    'customer_code' => 'CUST-102',
                    'fabric_name' => 'جينز قطني ثقيل 12 أونصة مستورد إيطالي',
                    'fabric_code' => 'FAB-DNM-12OZ',
                    'received_meters' => 2400.0,
                    'consumed_meters' => 2318.0,
                    'returned_meters' => 82.0,
                    'remaining_meters' => 0.0,
                    'rolls_count' => 16,
                    'receipt_number' => 'CMR-202611-1002',
                    'weight_kg' => 890.0,
                    'inspector' => 'محمود السيد (فني القص الرئيسي)',
                ],
                [
                    'customer_code' => 'CUST-103',
                    'fabric_name' => 'سنجل جيرسي 100% قطن مصري ممشط ناعم',
                    'fabric_code' => 'FAB-JRSY-100',
                    'received_meters' => 3200.0,
                    'consumed_meters' => 1800.0,
                    'returned_meters' => 28.0,
                    'remaining_meters' => 1372.0,
                    'rolls_count' => 22,
                    'receipt_number' => 'CMR-202611-1003',
                    'weight_kg' => 576.0,
                    'inspector' => 'وليد عبد العظيم النجار',
                ],
                [
                    'customer_code' => 'CUST-104',
                    'fabric_name' => 'قماش وتربروف مبطن عازل للحرارة',
                    'fabric_code' => 'FAB-WPRF-880',
                    'received_meters' => 1100.0,
                    'consumed_meters' => 550.0,
                    'returned_meters' => 0.0,
                    'remaining_meters' => 550.0,
                    'rolls_count' => 8,
                    'receipt_number' => 'CMR-202611-1004',
                    'weight_kg' => 340.0,
                    'inspector' => 'أمين المخازن',
                ],
                [
                    'customer_code' => 'CUST-105',
                    'fabric_name' => 'جابردين عالي الكثافة معالج لليونيفورم المكتبي',
                    'fabric_code' => 'FAB-GAB-750',
                    'received_meters' => 1500.0,
                    'consumed_meters' => 0.0,
                    'returned_meters' => 0.0,
                    'remaining_meters' => 1500.0,
                    'rolls_count' => 10,
                    'receipt_number' => 'CMR-202611-1005',
                    'weight_kg' => 480.0,
                    'inspector' => 'خالد إبراهيم',
                ],
            ];

            foreach ($materialsData as $md) {
                if (!isset($customerModels[$md['customer_code']])) continue;
                $cust = $customerModels[$md['customer_code']];
                $cm = CustomerMaterial::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('fabric_name', $md['fabric_name'])->first();
                if (!$cm) {
                    $cm = CustomerMaterial::create([
                        'id' => (string) Str::uuid(),
                        'tenant_id' => $tenantId,
                        'customer_id' => $cust->id,
                        'customer_name' => $cust->name,
                        'fabric_name' => $md['fabric_name'],
                        'fabric_code' => $md['fabric_code'],
                        'gsm' => 280.0,
                        'usable_width_meters' => 1.65,
                        'received_meters' => $md['received_meters'],
                        'consumed_meters' => $md['consumed_meters'],
                        'waste_meters' => 0.0,
                        'returned_meters' => $md['returned_meters'],
                        'remaining_meters' => $md['remaining_meters'],
                        'warehouse_id' => $warehouse->id,
                    ]);
                }

                $receipt = CustomerMaterialReceipt::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('receipt_number', $md['receipt_number'])->first();
                if (!$receipt) {
                    CustomerMaterialReceipt::create([
                        'id' => (string) Str::uuid(),
                        'tenant_id' => $tenantId,
                        'receipt_number' => $md['receipt_number'],
                        'customer_id' => $cust->id,
                        'customer_material_id' => $cm->id,
                        'customer_name' => $cust->name,
                        'warehouse_id' => $warehouse->id,
                        'fabric_name' => $md['fabric_name'],
                        'fabric_code' => $md['fabric_code'],
                        'received_meters' => $md['received_meters'],
                        'received_weight_kg' => $md['weight_kg'],
                        'usable_width_meters' => 1.65,
                        'gsm' => 280.0,
                        'rolls_count' => $md['rolls_count'],
                        'condition_status' => 'accepted',
                        'inspector_name' => $md['inspector'],
                        'notes' => 'أمانة قماش عميل معزولة بالمستودع طبقاً للأصول المحاسبية.',
                    ]);
                }
            }

            $jobsData = [
                [
                    'order_number' => 'PO-CMT-2026-001',
                    'customer_code' => 'CUST-101',
                    'service_type' => 'cmt',
                    'model_name' => 'سويت شيرت هودي رجالي شتوي (Heavy Hoodie)',
                    'target_qty' => 1200,
                    'cut_qty' => 1200,
                    'delivered_qty' => 800,
                    'unit_rate' => 45.0,
                    'status' => 'in_progress',
                    'total_meters' => 1850.0,
                ],
                [
                    'order_number' => 'PO-CUT-2026-002',
                    'customer_code' => 'CUST-102',
                    'service_type' => 'contract_cutting',
                    'model_name' => 'بنطلون جينز كاجوال كلاسيك 5 جيوب',
                    'target_qty' => 2500,
                    'cut_qty' => 2500,
                    'delivered_qty' => 2500,
                    'unit_rate' => 8.5,
                    'status' => 'completed',
                    'total_meters' => 2400.0,
                ],
                [
                    'order_number' => 'PO-CMT-2026-003',
                    'customer_code' => 'CUST-103',
                    'service_type' => 'cmt',
                    'model_name' => 'تي شيرت بولو ولادي مطرز فاخر',
                    'target_qty' => 1800,
                    'cut_qty' => 1800,
                    'delivered_qty' => 1200,
                    'unit_rate' => 32.0,
                    'status' => 'in_progress',
                    'total_meters' => 3200.0,
                ],
                [
                    'order_number' => 'PO-CUT-2026-004',
                    'customer_code' => 'CUST-104',
                    'service_type' => 'contract_cutting',
                    'model_name' => 'جاكيت وتربروف رجالي ببطانة فرو',
                    'target_qty' => 900,
                    'cut_qty' => 900,
                    'delivered_qty' => 450,
                    'unit_rate' => 12.0,
                    'status' => 'in_progress',
                    'total_meters' => 1100.0,
                ],
                [
                    'order_number' => 'PO-CMT-2026-005',
                    'customer_code' => 'CUST-105',
                    'service_type' => 'cmt',
                    'model_name' => 'بدلة عمل متكاملة (أفرول + جاكيت صناعي)',
                    'target_qty' => 600,
                    'cut_qty' => 0,
                    'delivered_qty' => 0,
                    'unit_rate' => 65.0,
                    'status' => 'confirmed',
                    'total_meters' => 1500.0,
                ],
                [
                    'order_number' => 'PO-CUT-2026-006',
                    'customer_code' => 'CUST-103',
                    'service_type' => 'contract_cutting',
                    'model_name' => 'شورت برمودا بناتي صيفي مطبوع',
                    'target_qty' => 1500,
                    'cut_qty' => 1500,
                    'delivered_qty' => 1500,
                    'unit_rate' => 7.0,
                    'status' => 'completed',
                    'total_meters' => 950.0,
                ],
            ];

            $jobModels = [];
            foreach ($jobsData as $jd) {
                if (!isset($customerModels[$jd['customer_code']])) continue;
                $cust = $customerModels[$jd['customer_code']];
                $job = JobOrder::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('order_number', $jd['order_number'])->first();
                if (!$job) {
                    $job = JobOrder::create([
                        'id' => (string) Str::uuid(),
                        'tenant_id' => $tenantId,
                        'order_number' => $jd['order_number'],
                        'customer_id' => $cust->id,
                        'customer_name' => $cust->name,
                        'service_type' => $jd['service_type'],
                        'model_name' => $jd['model_name'],
                        'total_target_quantity' => $jd['target_qty'],
                        'total_cut_quantity' => $jd['cut_qty'],
                        'total_delivered_quantity' => $jd['delivered_qty'],
                        'total_received_meters' => $jd['total_meters'],
                        'unit_rate' => $jd['unit_rate'],
                        'assigned_employee_id' => $empCutter->id,
                        'assigned_employee_name' => $empCutter->name,
                        'status' => $jd['status'],
                        'pricing_basis' => 'per_piece',
                    ]);
                }
                $jobModels[$jd['order_number']] = $job;
            }

            $invData = [
                [
                    'inv_number' => 'INV-CMT-2026-501',
                    'job_number' => 'PO-CMT-2026-001',
                    'customer_code' => 'CUST-101',
                    'service_amount' => 36000.0,
                    'extra' => 0.0,
                    'deductions' => 0.0,
                    'total' => 36000.0,
                    'paid' => 20000.0,
                    'due_date' => '2026-11-25',
                    'status' => 'partially_paid',
                    'notes' => 'دفعة أولى 20,000 ج.م مسددة تحويل بنكي.',
                ],
                [
                    'inv_number' => 'INV-CUT-2026-502',
                    'job_number' => 'PO-CUT-2026-002',
                    'customer_code' => 'CUST-102',
                    'service_amount' => 21250.0,
                    'extra' => 0.0,
                    'deductions' => 0.0,
                    'total' => 21250.0,
                    'paid' => 21250.0,
                    'due_date' => '2026-11-07',
                    'status' => 'paid',
                    'notes' => 'تم السداد كاش فوري بالخزينة.',
                ],
                [
                    'inv_number' => 'INV-CMT-2026-503',
                    'job_number' => 'PO-CMT-2026-003',
                    'customer_code' => 'CUST-103',
                    'service_amount' => 38400.0,
                    'extra' => 0.0,
                    'deductions' => 0.0,
                    'total' => 38400.0,
                    'paid' => 15000.0,
                    'due_date' => '2026-11-30',
                    'status' => 'partially_paid',
                    'notes' => 'نظام أقساط ودفعات: قسط أول 15,000 ج.م مسدد.',
                ],
            ];

            foreach ($invData as $iv) {
                if (!isset($customerModels[$iv['customer_code']]) || !isset($jobModels[$iv['job_number']])) continue;
                $cust = $customerModels[$iv['customer_code']];
                $job = $jobModels[$iv['job_number']];
                $inv = JobInvoice::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('invoice_number', $iv['inv_number'])->first();
                if (!$inv) {
                    JobInvoice::create([
                        'id' => (string) Str::uuid(),
                        'tenant_id' => $tenantId,
                        'invoice_number' => $iv['inv_number'],
                        'job_order_id' => $job->id,
                        'order_number' => $job->order_number,
                        'customer_id' => $cust->id,
                        'customer_name' => $cust->name,
                        'invoice_date' => '2026-11-05',
                        'due_date' => $iv['due_date'],
                        'service_amount' => $iv['service_amount'],
                        'additional_charges' => $iv['extra'],
                        'deductions' => $iv['deductions'],
                        'tax_amount' => 0.0,
                        'total_amount' => $iv['total'],
                        'paid_amount' => $iv['paid'],
                        'status' => $iv['status'],
                        'notes' => $iv['notes'],
                    ]);
                }
            }
        }
    }
}

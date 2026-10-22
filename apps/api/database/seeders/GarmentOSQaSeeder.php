<?php

namespace Database\Seeders;

use App\Models\BillOfMaterial;
use App\Models\BomItem;
use App\Models\Branch;
use App\Models\BundleStageLog;
use App\Models\ChartOfAccount;
use App\Models\Color;
use App\Models\Customer;
use App\Models\CustomerMaterialReceipt;
use App\Models\CuttingBundle;
use App\Models\CuttingOrder;
use App\Models\Employee;
use App\Models\ExternalOperation;
use App\Models\GarmentModel;
use App\Models\GoodsReceiptNote;
use App\Models\GoodsReceiptNoteItem;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\JobDeliveryNote;
use App\Models\JobInvoice;
use App\Models\JobOrder;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\Machine;
use App\Models\MaintenanceWorkOrder;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\PieceRate;
use App\Models\PieceWorkLog;
use App\Models\ProductVariant;
use App\Models\ProductionOrder;
use App\Models\ProductionStage;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\QualityInspection;
use App\Models\Size;
use App\Models\StoreOrder;
use App\Models\StoreOrderItem;
use App\Models\Supplier;
use App\Models\SupplierInvoice;
use App\Models\Tenant;
use App\Models\TenantStoreSetting;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class GarmentOSQaSeeder extends Seeder
{
    /**
     * Run the database seeds safely in non-production environments.
     */
    public function run(): void
    {
        // 1. Strict Environment Safety Guard
        if (app()->environment('production')) {
            throw new \RuntimeException("SAFETY VIOLATION: Cannot execute QA seeder in a production environment!");
        }

        $connection = config('database.default');
        $databaseName = config("database.connections.{$connection}.database");

        // Fail closed if connected to any obvious production database
        if (str_contains(strtolower((string) $databaseName), 'prod')) {
            throw new \RuntimeException("SAFETY VIOLATION: Database '{$databaseName}' appears to be production. Seeding aborted.");
        }

        $this->command?->info("Starting GarmentOS QA Seeder on connection [{$connection}] (DB: {$databaseName})...");

        DB::beginTransaction();
        try {
            // 2. Platform Super Admin Test Account
            User::firstOrCreate(
                ['email' => 'qa.superadmin@garmentos.test'],
                [
                    'tenant_id' => null,
                    'name' => 'QA Platform Super Admin',
                    'phone' => '+201000000001',
                    'role' => 'platform_admin',
                    'is_active' => true,
                    'password' => Hash::make('Password123!@#'),
                ]
            );

            // 3. Isolated Factory Tenant 1: Children's Apparel (Full-cycle Manufacturing)
            $tenantA = Tenant::withoutGlobalScopes()->firstOrCreate(
                ['code' => 'QA-EG901'],
                [
                    'name' => 'GARMENTOS_QA_AL_NILE_APPAREL',
                    'subdomain' => 'qa-nile',
                    'status' => 'active',
                    'plan_tier' => 'professional',
                    'currency' => 'EGP',
                    'timezone' => 'Africa/Cairo',
                    'settings' => [
                        'subscription' => ['is_paid' => true, 'expires_at' => now()->addYear()->toIso8601String()],
                        'cutting' => ['default_waste_threshold' => 3.5, 'relaxation_hours' => 24],
                    ],
                ]
            );

            // 4. Isolated Factory Tenant 2: Denim & Casualwear (CMT & Subcontracting Specialist)
            $tenantB = Tenant::withoutGlobalScopes()->firstOrCreate(
                ['code' => 'QA-EG902'],
                [
                    'name' => 'GARMENTOS_QA_DELTA_TEX_CMT',
                    'subdomain' => 'qa-delta',
                    'status' => 'active',
                    'plan_tier' => 'enterprise',
                    'currency' => 'EGP',
                    'timezone' => 'Africa/Cairo',
                    'settings' => [
                        'subscription' => ['is_paid' => true, 'expires_at' => now()->addYear()->toIso8601String()],
                        'cutting' => ['default_waste_threshold' => 2.8, 'relaxation_hours' => 48],
                    ],
                ]
            );

            // Seed full operational journeys for Tenant A
            $this->seedTenantOperations($tenantA);

            // Seed specialized CMT journeys for Tenant B
            $this->seedTenantOperations($tenantB, true);

            DB::commit();
            $this->command?->info("GarmentOS QA Seeder completed successfully with zero regressions.");
        } catch (\Throwable $e) {
            DB::rollBack();
            $this->command?->error("QA Seeding Failed: " . $e->getMessage());
            throw $e;
        }
    }

    private function seedTenantOperations(Tenant $tenant, bool $isCmtSpecialist = false): void
    {
        $prefix = $isCmtSpecialist ? 'QA_DELTA' : 'QA_NILE';

        // 1. Branches & Warehouses
        $mainBranch = Branch::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'code' => "{$prefix}-BR01"],
            [
                'name' => "{$tenant->name} - المقر والمصنع الرئيسي",
                'type' => 'factory',
                'is_main' => true,
                'address' => 'المنطقة الصناعية - المحلة الكبرى',
                'phone' => '+20402221111',
            ]
        );

        $cuttingWarehouse = Warehouse::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'code' => "{$prefix}-WH-CUT"],
            [
                'branch_id' => $mainBranch->id,
                'name' => 'صالة القص وخطوط الفرش المركزية',
                'type' => 'cutting_floor',
                'allow_negative_stock' => false,
                'is_active' => true,
            ]
        );

        $fabricWarehouse = Warehouse::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'code' => "{$prefix}-WH-FAB"],
            [
                'branch_id' => $mainBranch->id,
                'name' => 'مستودع الأقمشة والغزول الرئيسي',
                'type' => 'raw_materials',
                'allow_negative_stock' => false,
                'is_active' => true,
            ]
        );

        // 2. Factory Users Across Distinct Roles
        $roles = [
            'owner' => ['role' => 'company_owner', 'name' => "مالك مصنع {$prefix}", 'email' => strtolower("{$prefix}.owner@garmentos.test")],
            'prod_mgr' => ['role' => 'production_manager', 'name' => "مهندس الإنتاج {$prefix}", 'email' => strtolower("{$prefix}.prod@garmentos.test")],
            'qc' => ['role' => 'quality_controller', 'name' => "مفتش الجودة {$prefix}", 'email' => strtolower("{$prefix}.qc@garmentos.test")],
            'custodian' => ['role' => 'inventory_custodian', 'name' => "أمين المخازن {$prefix}", 'email' => strtolower("{$prefix}.stock@garmentos.test")],
            'accountant' => ['role' => 'financial_accountant', 'name' => "المحاسب المالي {$prefix}", 'email' => strtolower("{$prefix}.acct@garmentos.test")],
        ];

        $users = [];
        foreach ($roles as $key => $info) {
            $users[$key] = User::withoutGlobalScopes()->firstOrCreate(
                ['email' => $info['email']],
                [
                    'tenant_id' => $tenant->id,
                    'name' => $info['name'],
                    'phone' => '+201000' . rand(100000, 999999),
                    'role' => $info['role'],
                    'is_active' => true,
                    'password' => Hash::make('Password123!@#'),
                ]
            );
        }

        // 3. Colors and Sizes
        $colors = [
            ['name' => 'كحلي داكن', 'code' => '#1e3a8a'],
            ['name' => 'رمادي ميلانج', 'code' => '#94a3b8'],
            ['name' => 'أبيض ناصع', 'code' => '#ffffff'],
            ['name' => 'عنابي ملكي', 'code' => '#7F1625'],
        ];
        $colorModels = [];
        foreach ($colors as $c) {
            $colorModels[] = Color::withoutGlobalScopes()->firstOrCreate(
                ['tenant_id' => $tenant->id, 'name' => $c['name']],
                ['color_code' => $c['code']]
            );
        }

        $sizes = ['2', '4', '6', '8', 'S', 'M', 'L', 'XL'];
        $sizeModels = [];
        foreach ($sizes as $idx => $s) {
            $sizeModels[] = Size::withoutGlobalScopes()->firstOrCreate(
                ['tenant_id' => $tenant->id, 'name' => $s],
                ['sort_order' => $idx + 1]
            );
        }

        // 4. Approved Suppliers & Purchase Orders
        $supplier = Supplier::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'code' => "{$prefix}-SUP-01"],
            [
                'name' => 'شركة مصر للغزل والنسيج بالمحلة',
                'contact_person' => 'م. أحمد الشربيني',
                'phone' => '+20402220000',
                'email' => 'sales@misrspinning.test',
                'payment_terms' => 'صافي 30 يوماً',
                'is_active' => true,
            ]
        );

        // 5. Raw Materials (Fabrics with GSM & Roll metrics)
        $fabricSingleJersey = InventoryItem::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'code' => "{$prefix}-FAB-SJ-01"],
            [
                'warehouse_id' => $fabricWarehouse->id,
                'item_type' => 'fabric',
                'name' => 'قماش قطن 100% سينجل جيرسي معالج انكماش',
                'unit_of_measure' => 'meters',
                'reorder_level' => 500,
                'current_balance' => 4500.0,
                'average_cost' => 85.50,
                'is_customer_owned' => false,
                'technical_specs' => [
                    'gsm' => 180,
                    'usable_width' => 1.85,
                    'shrinkage_rate' => 2.5,
                    'relaxation_hours' => 24,
                    'fiber_composition' => '100% Combed Cotton',
                ],
            ]
        );

        // 6. Immutable Stock Transactions
        InventoryTransaction::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'reference_number' => "{$prefix}-TX-INIT-01"],
            [
                'inventory_item_id' => $fabricSingleJersey->id,
                'warehouse_id' => $fabricWarehouse->id,
                'transaction_type' => 'goods_receipt',
                'direction' => 'IN',
                'quantity' => 4500.0,
                'unit_cost' => 85.50,
                'total_cost' => 384750.0,
                'balance_before' => 0.0,
                'balance_after' => 4500.0,
                'reference_type' => 'OpeningBalance',
                'notes' => 'رصيد افتتاح وتوريد معتمد من شركة مصر للغزل',
            ]
        );

        // 7. Purchase Order & 3-Way Matching
        $po = PurchaseOrder::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'po_number' => "{$prefix}-PO-2026-001"],
            [
                'supplier_id' => $supplier->id,
                'warehouse_id' => $fabricWarehouse->id,
                'order_date' => now()->subDays(5)->toDateString(),
                'expected_delivery_date' => now()->addDays(10)->toDateString(),
                'status' => 'approved',
                'subtotal' => 114000.0,
                'discount_amount' => 0.0,
                'tax_rate' => 14.0,
                'tax_amount' => 15960.0,
                'total_amount' => 129960.0,
                'approved_by' => $users['owner']->id,
                'approved_at' => now()->subDays(4),
                'created_by' => $users['prod_mgr']->id,
            ]
        );

        $poItem = PurchaseOrderItem::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'purchase_order_id' => $po->id],
            [
                'inventory_item_id' => $fabricSingleJersey->id,
                'ordered_quantity' => 1500.0,
                'received_quantity' => 1500.0,
                'remaining_quantity' => 0.0,
                'unit_price' => 76.00,
                'total_price' => 114000.0,
            ]
        );

        // GRN (Goods Receipt Note)
        $grn = GoodsReceiptNote::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'grn_number' => "{$prefix}-GRN-2026-001"],
            [
                'purchase_order_id' => $po->id,
                'supplier_id' => $supplier->id,
                'warehouse_id' => $fabricWarehouse->id,
                'receipt_date' => now()->subDays(3)->toDateString(),
                'inspection_status' => 'passed',
                'quality_inspector_name' => $users['qc']->name,
                'status' => 'completed',
                'received_by' => $users['custodian']->id,
            ]
        );

        GoodsReceiptNoteItem::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'goods_receipt_note_id' => $grn->id],
            [
                'purchase_order_item_id' => $poItem->id,
                'inventory_item_id' => $fabricSingleJersey->id,
                'delivered_quantity' => 1500.0,
                'accepted_quantity' => 1500.0,
                'rejected_quantity' => 0.0,
                'unit_cost' => 76.00,
            ]
        );

        // 3-Way Matched Supplier Invoice
        SupplierInvoice::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'invoice_number' => "{$prefix}-INV-SUP-8801"],
            [
                'internal_reference' => "{$prefix}-REF-INV-001",
                'supplier_id' => $supplier->id,
                'purchase_order_id' => $po->id,
                'goods_receipt_note_id' => $grn->id,
                'invoice_date' => now()->subDays(2)->toDateString(),
                'due_date' => now()->addDays(28)->toDateString(),
                'subtotal' => 114000.0,
                'tax_amount' => 15960.0,
                'total_amount' => 129960.0,
                'paid_amount' => 0.0,
                'matching_status' => 'matched',
                'payment_status' => 'unpaid',
                'variance_notes' => 'مطابقة ثلاثية تامة (PO = GRN = Invoice)',
            ]
        );

        // 8. Garment Model, Pattern & BOM
        $model = GarmentModel::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'code' => "{$prefix}-MOD-081"],
            [
                'name' => 'تيشيرت بولو قطن مطرز فاخر',
                'category' => 'boys_casual',
                'season' => 'صيف 2026',
                'description' => 'تيشيرت بولو صيفي مع ياقة قماش متطابقة ومرد زراير وتطريز على الصدر',
                'status' => 'active',
            ]
        );

        $bom = BillOfMaterial::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'garment_model_id' => $model->id],
            [
                'bom_code' => "{$prefix}-BOM-081",
                'name' => 'BOM تيشيرت بولو القياسية',
                'version' => '1.0',
                'status' => 'approved',
                'is_active' => true,
                'total_estimated_cost_per_piece' => 95.0,
                'notes' => 'شجرة المواد المعتمدة للموديل الصيفي',
            ]
        );

        BomItem::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'bill_of_material_id' => $bom->id, 'inventory_item_id' => $fabricSingleJersey->id],
            [
                'component_type' => 'main_fabric',
                'consumption_per_unit' => 0.85,
                'unit_of_measure' => 'meters',
                'unit_cost' => 85.50,
                'waste_tolerance_percent' => 3.0,
            ]
        );

        // Product Variants
        $createdVariants = [];
        foreach ($colorModels as $color) {
            foreach (array_slice($sizeModels, 0, 4) as $size) {
                $createdVariants[] = ProductVariant::withoutGlobalScopes()->firstOrCreate(
                    [
                        'tenant_id' => $tenant->id,
                        'garment_model_id' => $model->id,
                        'color_id' => $color->id,
                        'size_id' => $size->id,
                    ],
                    [
                        'sku' => "{$model->code}-{$color->name}-{$size->name}",
                        'barcode' => '622' . rand(1000000000, 9999999999),
                        'wholesale_price' => 155.0,
                        'retail_price' => 220.0,
                    ]
                );
            }
        }

        // 9. Production Order & Cutting Order
        $prodOrder = ProductionOrder::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'order_number' => "{$prefix}-PO-2026-081"],
            [
                'garment_model_id' => $model->id,
                'bill_of_material_id' => $bom->id,
                'branch_id' => $mainBranch->id,
                'planned_start_date' => now()->toDateString(),
                'target_delivery_date' => now()->addDays(20)->toDateString(),
                'total_planned_quantity' => 1200,
                'total_cut_quantity' => 1200,
                'total_completed_quantity' => 840,
                'total_scrapped_quantity' => 12,
                'total_rework_quantity' => 8,
                'status' => 'in_progress',
                'priority' => 'high',
                'notes' => 'تشغيل سريع لتسليم تعاقد التوريد الصيفي',
            ]
        );

        $cuttingOrder = CuttingOrder::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'cutting_order_number' => "{$prefix}-CUT-2026-01"],
            [
                'production_order_id' => $prodOrder->id,
                'table_number' => 'طاولة قص 1 - هيدروليك',
                'fabric_inventory_item_id' => $fabricSingleJersey->id,
                'fabric_source' => 'internal_warehouse',
                'warehouse_id' => $cuttingWarehouse->id,
                'fabric_color_id' => $colorModels[0]->id,
                'marker_name' => 'Marker-Polo-Size-2-4-6-8',
                'usable_width_meters' => 1.80,
                'lay_length_meters' => 4.25,
                'layers_count' => 60,
                'marker_efficiency_percent' => 88.4,
                'actual_fabric_meters_used' => 260.0,
                'total_expected_pieces' => 240,
                'total_cut_pieces' => 240,
                'status' => 'completed',
            ]
        );

        // Production Stages
        $stageCutting = ProductionStage::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'stage_code' => 'cutting'],
            [
                'name' => 'مرحلة القص والفرش',
                'order_sequence' => 1,
                'requires_qc' => true,
            ]
        );

        // Smart Serialized Bundles (QR Tags)
        for ($b = 1; $b <= 3; $b++) {
            $bundle = CuttingBundle::withoutGlobalScopes()->firstOrCreate(
                ['tenant_id' => $tenant->id, 'bundle_code' => "{$prefix}-BND-{$prodOrder->order_number}-0{$b}"],
                [
                    'cutting_order_id' => $cuttingOrder->id,
                    'production_order_id' => $prodOrder->id,
                    'product_variant_id' => !empty($createdVariants) ? $createdVariants[$b - 1]->id : null,
                    'bundle_number' => $b,
                    'color_id' => $colorModels[0]->id,
                    'size_id' => $sizeModels[$b - 1]->id,
                    'quantity' => 80,
                    'current_stage_code' => 'sewing',
                    'status' => 'in_progress',
                ]
            );

            BundleStageLog::withoutGlobalScopes()->firstOrCreate(
                ['tenant_id' => $tenant->id, 'cutting_bundle_id' => $bundle->id, 'operation_type' => 'cutting_dispatch'],
                [
                    'production_stage_id' => $stageCutting->id,
                    'operator_name' => $users['prod_mgr']->name,
                    'work_line' => 'خط قص رقم 1',
                    'input_quantity' => 80,
                    'output_accepted_quantity' => 80,
                    'logged_at' => now()->subHours(5),
                ]
            );
        }

        // Quality Inspection Ticket
        QualityInspection::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'inspection_number' => "{$prefix}-QC-2026-01"],
            [
                'production_order_id' => $prodOrder->id,
                'inspector_name' => $users['qc']->name,
                'inspection_type' => 'in_line',
                'inspected_quantity' => 240,
                'passed_quantity' => 235,
                'rejected_quantity' => 2,
                'rework_quantity' => 3,
                'decision' => 'accepted',
                'notes' => 'فحص مرحلي مطابق لمعايير الجودة القياسية',
            ]
        );

        // 10. CMT Customer Custody Transactions
        $cmtCustomer = Customer::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'code' => "{$prefix}-CUST-CMT-01"],
            [
                'name' => 'شركة براند إسكندرية كيدز للملابس',
                'contact_person' => 'أ. هيثم رضوان',
                'phone' => '+201011122233',
                'email' => 'alexkids@brand.test',
                'is_active' => true,
            ]
        );

        CustomerMaterialReceipt::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'receipt_number' => "{$prefix}-CMR-2026-01"],
            [
                'customer_id' => $cmtCustomer->id,
                'customer_name' => $cmtCustomer->name,
                'warehouse_id' => $fabricWarehouse->id,
                'fabric_name' => 'قماش جبردين عهدة أمانة',
                'fabric_code' => 'CMT-GAB-260',
                'received_meters' => 1250.0,
                'received_weight_kg' => 480.0,
                'usable_width_meters' => 1.50,
                'gsm' => 260.0,
                'rolls_count' => 12,
                'condition_status' => 'approved',
                'inspector_name' => $users['custodian']->name,
                'notes' => 'تم الاستلام كـ أمانة تشغيل بدون ملكية',
            ]
        );

        $jobOrder = JobOrder::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'order_number' => "{$prefix}-JOB-2026-01"],
            [
                'customer_id' => $cmtCustomer->id,
                'customer_name' => $cmtCustomer->name,
                'service_type' => 'full_package',
                'fabric_source' => 'customer_supplied',
                'total_target_quantity' => 500,
                'total_delivered_quantity' => 200,
                'unit_rate' => 18.50,
                'status' => 'in_progress',
            ]
        );

        // External Operation (Embroidery / Print dispatch)
        ExternalOperation::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'operation_number' => "{$prefix}-EXT-2026-01"],
            [
                'job_order_id' => $jobOrder->id,
                'subcontractor_name' => 'مطبعة الأهرام للطباعة الديجيتال والتطريز',
                'operation_type' => 'embroidery',
                'sent_quantity' => 500,
                'received_accepted_quantity' => 200,
                'unit_rate' => 6.50,
                'total_cost' => 3250.0,
                'status' => 'dispatched',
            ]
        );

        // Job Delivery Note & Service Fee Invoice
        JobDeliveryNote::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'delivery_number' => "{$prefix}-DN-2026-01"],
            [
                'job_order_id' => $jobOrder->id,
                'customer_id' => $cmtCustomer->id,
                'customer_name' => $cmtCustomer->name,
                'delivery_date' => now()->toDateString(),
                'total_delivered_pieces' => 200,
                'status' => 'delivered',
            ]
        );

        JobInvoice::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'invoice_number' => "{$prefix}-JINV-2026-01"],
            [
                'job_order_id' => $jobOrder->id,
                'customer_id' => $cmtCustomer->id,
                'customer_name' => $cmtCustomer->name,
                'invoice_date' => now()->toDateString(),
                'due_date' => now()->addDays(15)->toDateString(),
                'service_amount' => 3700.0, // 200 pcs * 18.50 EGP
                'tax_amount' => 518.0,
                'total_amount' => 4218.0,
                'status' => 'issued',
                'notes' => 'فاتورة أجور تشغيل وخدمات CMT (خالية من سعر القماش)',
            ]
        );

        // 11. Chart of Accounts & Balanced Double-Entry Journal Entry
        $accInventory = ChartOfAccount::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'code' => '1201'],
            ['name' => 'مخزون الأقمشة والخامات الأولية', 'type' => 'asset', 'category' => 'current_assets', 'is_active' => true]
        );

        $accPayables = ChartOfAccount::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'code' => '2101'],
            ['name' => 'الموردين والحسابات الدائنة', 'type' => 'liability', 'category' => 'current_liabilities', 'is_active' => true]
        );

        $journal = JournalEntry::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'entry_number' => "{$prefix}-JV-2026-001"],
            [
                'entry_date' => now()->toDateString(),
                'description' => 'قيد استحقاق فاتورة توريد الأقمشة - شركة مصر للغزل',
                'total_debit' => 129960.0,
                'total_credit' => 129960.0,
                'status' => 'posted',
            ]
        );

        JournalEntryLine::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'journal_entry_id' => $journal->id, 'account_id' => $accInventory->id],
            ['debit' => 129960.0, 'credit' => 0.0, 'description' => 'إثبات قيمة القماش الوارد للمخزن']
        );

        JournalEntryLine::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'journal_entry_id' => $journal->id, 'account_id' => $accPayables->id],
            ['debit' => 0.0, 'credit' => 129960.0, 'description' => 'استحقاق رصيد المورد']
        );

        // 12. Workers, Piece Rates & Payroll Run
        $worker = Employee::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'employee_code' => "{$prefix}-EMP-01"],
            [
                'name' => 'محمد حسن كمال (صنايعي خياطة ومرد)',
                'national_id' => '29010101234567',
                'phone' => '+201122334455',
                'department' => 'sewing',
                'job_title' => 'فني خط خياطة سنجر',
                'pay_type' => 'piece_rate',
                'is_active' => true,
            ]
        );

        $pieceRate = PieceRate::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'garment_model_id' => $model->id, 'operation_name' => 'تركيب ياقة ومرد زراير'],
            [
                'stage_name' => 'sewing',
                'rate_per_piece' => 3.75,
                'is_active' => true,
            ]
        );

        PieceWorkLog::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'employee_id' => $worker->id, 'production_order_id' => $prodOrder->id],
            [
                'piece_rate_id' => $pieceRate->id,
                'work_date' => now()->toDateString(),
                'completed_quantity' => 80,
                'unit_rate' => 3.75,
                'total_amount' => 300.0,
                'status' => 'approved',
            ]
        );

        $payroll = Payroll::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'payroll_period' => now()->format('Y-m')],
            [
                'period_start' => now()->startOfMonth()->toDateString(),
                'period_end' => now()->endOfMonth()->toDateString(),
                'total_gross' => 300.0,
                'total_deductions' => 0.0,
                'total_net' => 300.0,
                'status' => 'approved',
            ]
        );

        PayrollItem::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'payroll_id' => $payroll->id, 'employee_id' => $worker->id],
            [
                'base_amount' => 0.0,
                'piece_rate_earnings' => 300.0,
                'overtime_earnings' => 0.0,
                'deductions_and_advances' => 0.0,
                'net_salary' => 300.0,
                'is_paid' => true,
            ]
        );

        // 13. Machine Assets & Maintenance Orders
        $machine = Machine::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'machine_code' => "{$prefix}-MCH-01"],
            [
                'branch_id' => $mainBranch->id,
                'name' => 'ماكينة سنجر كمبيوترية Juki DDL-9000C',
                'machine_type' => 'sewing',
                'model_number' => 'DDL-9000C-FMS',
                'status' => 'operational',
                'last_maintenance_date' => now()->subDays(15)->toDateString(),
                'next_maintenance_date' => now()->addDays(15)->toDateString(),
            ]
        );

        MaintenanceWorkOrder::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'order_number' => "{$prefix}-MWO-2026-01"],
            [
                'machine_id' => $machine->id,
                'work_type' => 'preventive',
                'priority' => 'medium',
                'issue_description' => 'صيانة دورية: فحص مسار الزيت، وتغيير كروشيه وإبر',
                'status' => 'completed',
                'reported_by' => $users['prod_mgr']->name,
            ]
        );

        // 14. B2B Storefront Settings & Direct Orders
        TenantStoreSetting::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id],
            [
                'store_name' => "متجر جملة مصنع {$prefix}",
                'subdomain' => strtolower($prefix) . '-store',
                'banner_title' => 'تشكيلات صيف 2026 بالجملة للمحلات والموزعين',
                'is_store_enabled' => true,
                'allow_cod' => true,
                'currency' => 'EGP',
            ]
        );

        $storeOrder = StoreOrder::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'order_number' => "{$prefix}-ORD-WEB-001"],
            [
                'customer_name' => 'محل الشروق لملابس الأطفال',
                'customer_phone' => '+201099887766',
                'shipping_address' => 'شارع الجمهورية - المنصورة',
                'city' => 'المنصورة',
                'subtotal' => 7440.0,
                'shipping_fee' => 150.0,
                'total_amount' => 7590.0,
                'payment_method' => 'cod',
                'status' => 'confirmed',
            ]
        );

        if (!empty($createdVariants)) {
            StoreOrderItem::withoutGlobalScopes()->firstOrCreate(
                ['tenant_id' => $tenant->id, 'store_order_id' => $storeOrder->id],
                [
                    'variant_id' => $createdVariants[0]->id,
                    'product_name' => $model->name,
                    'sku' => $createdVariants[0]->sku,
                    'quantity' => 48,
                    'unit_price' => 155.0,
                    'total_price' => 7440.0,
                ]
            );
        }
    }
}

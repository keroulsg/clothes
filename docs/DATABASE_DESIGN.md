# GarmentOS Cloud — التصميم الشامل لقاعدة البيانات والعلاقات (Database Schema & Architecture)

## 1. فلسفة التصميم والمعايير الإلزامية
1. **عزل المستأجرين (Multi-Tenancy):** كل جدول يخص الشركات يتضمن المفتاح الأجنبي `tenant_id` المفهرس مع فهارس مركبة (Composite Indexes).
2. **سلامة المراجع (Referential Integrity):** قيود مفاتيح أجنبية صارمة `FOREIGN KEY` مع سياسات واضحة (`ON DELETE RESTRICT` للمستندات والعمليات المحاسبية والمخزنية لمنع الحذف العشوائي).
3. **الدقة العددية والمالية:**
   - الحقول النقدية: `DECIMAL(14, 4)`
   - الكميات والمقاييس: `DECIMAL(12, 4)`
4. **سجل التدقيق والتتبع (Audit Trail):** حقول `created_by`, `updated_by`, `created_at`, `updated_at`, و`deleted_at` (Soft Deletes عند الحاجة).

---

## 2. خريطة الكيانات والمجموعات الرئيسية (Core Domain Schemas)

### المجموعة الأولى: إدارة المنصة والمستأجرين (Platform & SaaS Tenancy)
- `tenants`: الشركات والمصانع المشتركة (id, code, name, domain, logo, status, settings_json).
- `tenant_domains`: الدومينات الخاصة بالمصانع ومتاجرها.
- `plans`: باقات الاشتراك (Free Trial, Starter, Professional, Enterprise).
- `plan_features`: خصائص وحدود كل باقة (عدد الفروع، المخازن، المستخدمين، ماكينات القص).
- `subscriptions`: الاشتراكات وحالاتها (trial, active, past_due, suspended, cancelled).
- `subscription_invoices`: فواتير الاشتراك على المنصة وسجل الدفعات.
- `branches`: فروع كل شركة/مصنع (المصنع الرئيسي، صالة العرض، منفذ البيع، المخزن الخارجي).
- `users`: المستخدمون مع بيانات التحقق والأمان.
- `roles` & `permissions` & `model_has_roles`: نظام الصلاحيات المتقدم (RBAC).

### المجموعة الثانية: البيانات الأساسية والمنتجات (Master Data & Apparel Catalog)
- `categories`: تصنيفات المنتجات والخامات (أقمشة، أزرار، سست، خيوط، ملابس أطفال أولادي، بناتي).
- `units_of_measure`: وحدات القياس (متر، كجم، دستة، قطعة، ياردة، بكرة).
- `uom_conversions`: معاملات التحويل بين الوحدات (خاصة تحويل القماش من متر لكجم حسب كثافة النسيج GSM).
- `colors`: جدول الألوان (الاسم، كود البانتون Pantone، كود HEX).
- `sizes`: جدول المقاسات (حديثي ولادة، 6-9 شهور، 1-2 سنة، 4-6 سنوات، محيط الصدر، الطول).
- `garment_models`: الموديل الأساسي (كود الموديل، الاسم، نوع القطعة، المصمم، الموسم، صورة الباترون، مواصفات التشغيل).
- `product_variants`: المنتجات التامة القابلة للبيع (الربط بين الموديل + المقاس + اللون + الباركود الدولي + SKU + سعر الجملة والتجزئة).

### المجموعة الثالثة: المخازن وإدارة الخامات (Inventory & Stock Ledger)
- `branches`: الفروع ومواقع العمل (المصنع الرئيسي، ورش التشغيل، منافذ البيع) مع حقول `manager_name`, `is_active`, وحظر الحذف عند ارتباطه بمستودعات.
- `warehouses`: المخازن (مخزن قماش، مخزن مستلزمات، مخزن إنتاج تحت التشغيل WIP، مخزن منتج تام، وأنواع مخصصة) مع حقول `branch_id`, `manager_name`, `allow_negative_stock`, `is_active`, وحظر الحذف عند وجود رصيد مخزني.
- `warehouse_types`: أنواع المستودعات المعرفة للمستأجر (القياسية والمخصصة).
- `units_of_measure`: وحدات القياس الأساسية مع معاملات التحويل وحقل `is_active`.
- `inventory_items`: كارت الصنف (خام أو تام) وحد الطلب والحد الأدنى والباركود والوصف والاسم اللاتيني وموضع الرف (Rack/Shelf/Bin).
- `inventory_transactions`: دفتر الأستاذ المخزني الدقيق وغير القابل للتعديل (حركات الإضافة، الصرف، التحويل الصادر، التحويل الوارد، فاقد القص، عجز الجرد، فائض الجرد، مع تسجيل الرصيد قبل وبعد الحركة).
- `stock_transfers` & `stock_transfer_items`: أذون التحويل بين المخازن والفروع وحالاتها (draft, dispatched [in-transit], received, cancelled).
- `stock_counts` & `stock_count_items`: جلسات ومحاضر الجرد الفعلي، لقطة الرصيد الدفتري، الكميات المحصورة، الفروقات، وترحيل قيود التسوية المعتمدة لدفتر الأستاذ.
- `stock_adjustments`: تسويات الجرد المعتمدة مع ربطها بالقيود المالية.
- `customer_materials`: سجل خامات العملاء المخصصة للتشغيل للغير والمفصولة تمامًا عن أصول المصنع.

### المجموعة الرابعة: المشتريات والموردين (Procurement)
- `suppliers`: الموردون، السجل التجاري، شروط الدفع، والحد الائتماني.
- `purchase_orders`: أوامر الشراء، مواعيد التوريد، والاعتمادات.
- `purchase_order_items`: بنود أمر الشراء والأسعار والكميات.
- `goods_receipt_notes` (GRN): أذون استلام البضاعة وفحص المطابقة الفنية.
- `supplier_invoices`: فواتير الموردين ومطابقتها الثلاثية (PO + GRN + Invoice).

### المجموعة الخامسة: تخطيط وتشغيل الإنتاج وقسم القص (Manufacturing, Cutting & QC)
- `bill_of_materials` (BOM): شجرة المكونات المعيارية لكل موديل (كمية القماش بالمتر، الإكسسوارات لكل مقاس، نسبة الهالك المسموح).
- `production_orders`: أوامر الإنتاج (الموديل، الكمية الإجمالية، تفصيل المقاسات والألوان، تاريخ البدء والتسليم، خط الإنتاج، مع حقول Batch 3: `customer_id`, `sales_order_id`, `responsible_person`, `cancelled_at`, `cancellation_reason`).
- `cutting_orders`: أوامر القص (Cutting Room) وخطط الفرش:
  - طول الفرشة، عدد الراقات/الطبقات (Layers)، استهلاك الأمتار، والكمية الناتجة (مع حقول Batch 3: `cancelled_at`, `cancellation_reason` لدعم حركات الاسترجاع المخزني `cutting_reversal`).
  - تسجيل عوادم القص والهالك الفعلي ونسبته مقارنة بالمعياري.
- `cutting_bundles`: حزم القص الناتجة، كروت التشغيل، والباركود اللاصق لكل حزمة (Bundle Cards) لتتبع مسارها في ورشة الخياطة (مع حقول Batch 3: `assigned_employee_id`, `work_group`, `issue_date`, `due_date`, `completion_date`, `accepted_quantity`, `rejected_quantity`, `rework_quantity`).
- `production_stages`: مراحل الإنتاج المخصصة (قص، تجهيز، خياطة، أوفر، تطريز، كوي، فحص، تغليف).
- `stage_operations_log` & `bundle_stage_logs`: سجل العمليات الفعلي (أمر الإنتاج، الحزمة، المرحلة، العامل، الكمية السليمة، المعيبة، كمية إعادة التشغيل rework_quantity، الملاحظات notes، ووقت الإنجاز مع فرض مطابقة الكميات).
- `quality_inspections`: فحص الجودة (معايير الفحص، القطع المقبولة، القطع المرفوضة، أسباب العيب، وإعادة التشغيل Rework).

### المجموعة السادسة: القص والتصنيع للغير (Subcontracting & Job-Work)
- `job_orders`: أوامر التشغيل للغير (قص فقط، أو تصنيع كامل CMT).
- `customer_material_receipts`: محاضر استلام أقمشة وخامات العميل بالأطوال والأوزان.
- `customer_material_balances`: أرصدة الخامات المسلمة من العميل ورصيد العوادم.
- `job_delivery_notes`: محاضر تسليم المنتج النهائي المقصوص أو المصنع للعميل واعتماده.
- `job_invoices`: فواتير أجور التشغيل واحتساب عمولة وخدمة المصنع.

### المجموعة السابعة: المبيعات، الفواتير، ونقاط البيع (Sales, Invoicing, Customers & POS)
- `customers`: سجل العملاء التجاريين (كود العميل، الاسم التجاري، تصنيف المنشأة classification، الاسم القانوني company_name، السجل التجاري commercial_registry، الرقم الضريبي tax_id، الحد الائتماني credit_limit، شروط السداد payment_terms، عنوان الفواتير، عنوان التسليم، الرصيد الافتتاحي، وحظر تكرار الكود والرقم الضريبي على مستوى المستأجر).
- `quotations`: عروض الأسعار وفترات الصلاحية (مع ربط التحويل لأمر البيع converted_sales_order_id وتاريخ التحويل converted_at).
- `sales_orders`: أوامر البيع وحجز المخزون التام (مع عنوان التسليم، وتاريخ وسبب الإلغاء cancellation_reason).
- `sales_invoices`: فواتير المبيعات الضريبية ونقاط البيع السريعة لمكتب المصنع (مع تاريخ وسبب الإلغاء، وحظر الإلغاء بعد السداد).
- `sales_invoice_items`: بنود الفاتورة بالربط مع الـ Variant المحدد.
- `sales_delivery_notes`: إذون تسليم وشحن طلبيات المبيعات وسجل شركة الشحن والتتبع وتاريخ وسبب الإلغاء.
- `sales_delivery_items`: بنود إذن التسليم والشحن لدعم التسليم الجزئي وربط بنود أمر البيع بالمخزون التام.
- `payment_voucher_allocations`: تخصيص مبالغ سندات القبض على فواتير المبيعات المفتوحة (تخصيص يدوي أو تلقائي بأقدم الفواتير FIFO).
- `credit_notes`: إشعارات الدائن المحاسبية المعتمدة الصادرة آلياً لمعادلة مديونية العميل عند تسجيل المرتجعات.
- `sales_returns`: مرتجعات المبيعات وسياسات رد البضاعة للمخزن وتصنيف البضاعة السليمة والهالكة.

### المجموعة الثامنة: الحسابات والتكاليف الصناعية (Accounting & Costing)
- `chart_of_accounts`: شجرة الحسابات المحاسبية الهرمية (الأصول، الخصوم، حقوق الملكية، الإيرادات، المصروفات، وتكاليف النشاط الصناعي) مع حقول: `name_en`, `parent_id`, `level`, `normal_balance`, `is_control_account`, `is_cash_bank`, `is_postable`, `opening_balance`, `notes`.
- `tenant_account_mappings`: جدول ربط الحسابات التشغيلية للمستأجر بمفاتيح قياسية (`mapping_key`, `account_id`, `notes`) دون أكواد ثابتة في الكود البرمجي.
- `journal_entries`: قيود اليومية المحاسبية العامة وحالات ترحيلها (`draft`, `posted`, `reversed`) مع حقول: `total_debit`, `total_credit`, `posted_at`, `posted_by`, `reversed_at`, `reversed_by`, `reversed_entry_id`, `reversal_reason`.
- `journal_entry_lines`: أطراف القيد (المدين والدائن ومركز التكلفة) مع حقول: `account_id`, `entry_type`, `amount`, `description`, `cost_center_id`.
- `cost_centers`: مراكز التكلفة التحليلية المتشعبة (`code`, `name`, `parent_id`, `level`, `is_active`, `description`).
- `financial_accounts`: الخزائن النقدية، البنوك، والمحافظ الإلكترونية للمستأجر (`code`, `name`, `type`, `chart_of_account_id`, `branch_id`, `account_number`, `currency`, `current_balance`, `opening_balance`, `is_active`).
- `financial_account_transfers`: التحويلات المالية الداخلية بين الخزائن والبنوك (`transfer_number`, `source_account_id`, `destination_account_id`, `amount`, `transfer_date`, `status`, `journal_entry_id`, `created_by`, `reversed_at`, `reversal_reason`).
- `fiscal_years`: السنوات المالية ومواعيد بدايتها ونهايتها وحالة الإقفال (`name`, `start_date`, `end_date`, `status`, `closed_at`, `closed_by`).
- `fiscal_periods`: الفترات المحاسبية الشهرية (`fiscal_year_id`, `period_number`, `name`, `start_date`, `end_date`, `status`, `is_closed`, `closed_at`, `closed_by`, `reopened_at`, `reopened_by`, `reopen_reason`).
- `payment_vouchers`: سندات الصرف وسندات القبض وحسابات الخزائن والبنوك.
- `production_cost_sheets`: بطاقات التكلفة الفعلية لأمر الإنتاج مع حقول:
  - تكلفة الخامات المباشرة المستهلكة فعليًا (`materials_cost` مع استبعاد خامات أمانات CMT).
  - تكلفة الأجور الصناعية المباشرة (`labor_cost` من واقع الإنتاج والرواتب).
  - تكلفة التشغيل الخارجي (`external_cost`).
  - التكاليف الصناعية غير المباشرة الموزعة (`overhead_cost` مع دعم طريقة التوزيع `overhead_allocation_method`).
  - التكلفة الإجمالية وتكلفة الوحدة المصنعة مع استيعاب الهالك (`unit_cost`)، واعتماد وقفل البطاقة (`is_locked`, `approved_by`, `approved_at`).

### المجموعة التاسعة: الموارد البشرية وإدارة القوى العاملة ومسيرات الرواتب (Phase C: Workforce & Payroll)
- `employees`: سجلات العمال والمشرفين (كود الموظف، الاسم، القسم، المهنة، نوع الأجر [قطعة/ساعي/يومي/أسبوعي/راتب/وردية/هجين]، الراتب الأساسي، سعر الساعة، أجر اليوم، أجر الأسبوع weekly_rate، أجر الوردية shift_rate، المهارات skills JSON، الوردية، تاريخ التعيين، الفرع).
- `attendances`: سجلات الحضور والانصراف وساعات العمل (وقت الدخول والخروج، الساعات الأساسية، الساعات الإضافية/الأوفرتايم 1.5x، دقائق التأخير، حالة الحضور، مستحق للأجر، وقيد تكرار فريد `[tenant_id, employee_id, attendance_date]`).
- `piece_rates`: لائحة أسعار العمليات الفنية والمراحل (قص، حياكة، تشطيب، كي، جودة) ومعدل القطعة القياسي.
- `piece_work_logs`: سجل إنتاجية العامل بالقطعة ومطابقتها بالحزم المقبولة من الجودة وأمر التشغيل مع حظر تكرار الصرف.
- `employee_adjustments`: السلف النقدية، سداد السلف، المكافآت، البدلات، والخصومات الإدارية مع دورة اعتماد مستقلة.
- `quality_defect_adjustments`: تسويات عيوب الجودة مع ملاحظات التحقيق الفني، حظر الخصم التلقائي، دورة اعتماد صريحة، وحق الاعتراض والإلغاء التعويضي.
- `payrolls`: مسيرات الرواتب الدورية (كود الفترة، تاريخ البداية والنهاية، الإجمالي، الاستقطاعات، الصافي، المدفوع، الرصيد المتبقي، بيانات الاعتماد والإقفال النهائي).
- `payroll_items`: بنود مستحقات كل عامل مفصلة (أساسي، إنتاجية قطعة، أجر ساعي، أجر يومي، أوفرتايم، بدلات، سداد سلف، خصومات عيوب جودة، مدفوع، متبقي) مع كائن JSON شفاف `calculation_breakdown`.
- `payroll_payments`: سندات الصرف والدفعات النقدية والبنكية للمسير (دفعات جزئية أو كاملة مع حظر تجاوز الرصيد المتبقي).

### المجموعة العاشرة: المتجر الإلكتروني لكل مصنع (E-Commerce Storefront)
- `tenant_store_settings`: إعدادات متجر المصنع (الشعار، الألوان الرئيسية، البانرات، خيارات الشحن، الدفع عند الاستلام).
- `store_carts`: عربات التسوق للمستهلكين ومزامنتها.
- `store_orders`: طلبات المتجر وتحديثات الشحن وربطها التلقائي بمخزون المصنع التام.


---

## 28. جداول وتوسيعات الدفعة 6 (Batch 6 Database Extensions & Entities)

### 28.1 جدول إثباتات وسندات دفع إنستاباي اليدوية (`payment_submissions`)
- `id`: UUID (Primary Key)
- `tenant_id`: UUID (Foreign Key -> tenants.id, Cascade)
- `store_order_id`: UUID (Foreign Key -> store_orders.id, Cascade)
- `sales_order_id`: UUID (Foreign Key -> sales_orders.id, Set Null, Nullable)
- `payment_method`: VARCHAR(50) (Default: 'instapay')
- `expected_amount`: DECIMAL(14, 4)
- `submitted_amount`: DECIMAL(14, 4) (Nullable)
- `currency`: VARCHAR(10) (Default: 'EGP')
- `transfer_reference`: VARCHAR(100) (Nullable)
- `receipt_file_path`: TEXT (مسار الملف في التخزين الخاص private/receipts/{tenantId})
- `receipt_original_name`: VARCHAR(255) (Nullable)
- `receipt_mime_type`: VARCHAR(100) (Nullable)
- `receipt_file_size`: UNSIGNED INT (Nullable)
- `status`: VARCHAR(50) (Default: 'pending_review' - pending_review, approved, rejected, cancelled)
- `reviewed_by`: UUID (Foreign Key -> users.id, Nullable)
- `reviewed_at`: TIMESTAMP (Nullable)
- `rejection_reason`: TEXT (Nullable)
- `payment_voucher_id`: UUID (Foreign Key -> payment_vouchers.id, Nullable)
- `audit_metadata`: JSON (Nullable)
- `created_at`, `updated_at`: TIMESTAMP

### 28.2 جدول طلبات الشراء الداخلية (`purchase_requisitions`)
- `id`: UUID (Primary Key)
- `tenant_id`: UUID (Foreign Key -> tenants.id, Cascade)
- `requisition_number`: VARCHAR(50) (Unique per tenant)
- `requested_by`: UUID (Foreign Key -> users.id, Nullable)
- `department`: VARCHAR(100) (القسم الطالب: القص، الحياكة، التعبئة...)
- `requisition_date`: DATE
- `required_date`: DATE (Nullable)
- `priority`: VARCHAR(20) (Default: 'normal' - low, normal, high, urgent)
- `status`: VARCHAR(50) (Default: 'draft' - draft, submitted, approved, rejected, converted, cancelled)
- `reason`: TEXT (Nullable)
- `notes`: TEXT (Nullable)
- `estimated_total_cost`: DECIMAL(14, 4) (Default: 0)
- `reviewed_by`: UUID (Foreign Key -> users.id, Nullable)
- `reviewed_at`: TIMESTAMP (Nullable)
- `rejection_reason`: TEXT (Nullable)
- `converted_purchase_order_id`: UUID (Foreign Key -> purchase_orders.id, Nullable)
- `converted_at`: TIMESTAMP (Nullable)
- `created_at`, `updated_at`: TIMESTAMP

### 28.3 جدول بنود طلب الشراء (`purchase_requisition_items`)
- `id`: UUID (Primary Key)
- `tenant_id`: UUID (Foreign Key -> tenants.id, Cascade)
- `purchase_requisition_id`: UUID (Foreign Key -> purchase_requisitions.id, Cascade)
- `inventory_item_id`: UUID (Foreign Key -> inventory_items.id, Set Null, Nullable)
- `item_name`: VARCHAR(255)
- `requested_quantity`: DECIMAL(12, 4)
- `approved_quantity`: DECIMAL(12, 4) (Nullable)
- `unit_of_measure`: VARCHAR(50) (Default: 'pcs')
- `estimated_unit_price`: DECIMAL(14, 4) (Default: 0)
- `estimated_total_price`: DECIMAL(14, 4) (Default: 0)
- `specifications`: TEXT (Nullable)
- `notes`: TEXT (Nullable)
- `created_at`, `updated_at`: TIMESTAMP

### 28.4 توسيعات الجداول القائمة لـ Batch 6
1. **جدول `inventory_items`:**
   - إضافة عمود `reserved_balance`: DECIMAL(14, 4) (Default: 0) لحجز المخزون دون إنقاص الرصيد الفعلي.
2. **جدول `store_orders`:**
   - إضافة عمود `sales_order_id`: UUID (Foreign Key -> sales_orders.id, Set Null).
3. **جدول `sales_orders`:**
   - إضافة عمود `store_order_id`: UUID (Foreign Key -> store_orders.id, Set Null).
   - إضافة عمود `channel`: VARCHAR(50) (Default: 'direct' - direct, storefront, pos, wholesale).
4. **جدول `tenant_store_settings`:**
   - إضافة أعمدة `instapay_identifier`: VARCHAR(100) (معرف إنستاباي المستقل للمصنع).
   - إضافة أعمدة `instapay_display_name`: VARCHAR(255) (الاسم المعتمد للتحويل).
   - إضافة أعمدة `instapay_account_verified`: BOOLEAN (Default: false).

---

## 29. توسيعات قاعدة البيانات للدفعة 9 (Batch 9: Storefront Templates & Self-Service Customizer)

### 29.1 توسيع جدول إعدادات المتجر الإلكتروني للمستأجر (`tenant_store_settings`)
تمت إضافة حقول دعم مسودة التصميم، الاستوديو التفاعلي، النسخ السابقة، والتدقيق الأمني:
- `draft_theme_id`: VARCHAR(50) (Nullable) — معرف قالب المتجر قيد التعديل كمسودة (`fashion_boutique`, `modern_catalog`, `kids_family`, `premium_brand`).
- `draft_theme_config`: JSON (Nullable) — التكوين الكامل للمسودة (الألوان، الخط، البانرات، ترتيب الأقسام، الشعار، أشرطة الإعلانات) دون التأثير على المتجر المنشور الحي.
- `previous_published_config`: JSON (Nullable) — لقطة أرشيفية كاملة لآخر تكوين منشور قبل النشر الجديد لتوفير خاصية الاسترجاع الآمن الفوري (`Rollback`).
- `published_at`: TIMESTAMP (Nullable) — تاريخ ووقت آخر عملية اعتماد ونشر للتصميم.
- `published_by`: UUID (Foreign Key -> users.id, Set Null, Nullable) — معرف المستخدم المسؤول عن عملية النشر للتدقيق والمحاسبية.


# GarmentOS Cloud — حالة وسجل تنفيذ المشروع (Implementation Status)

**تاريخ التحديث:** أكتوبر 2026  
**الإصدار المستهدف:** GarmentOS Cloud v1.0.0 (Commercial SaaS Release)  
**الحالة العامة:** المراحل 0 و 1 و 2 و 3 و 4 و 5 و 6 — تم التنفيذ والتحقق بنجاح (Verified)

---

## مصفوفة مراحل المشروع (Roadmap Phases)

| المرحلة | الوصف | الحالة | نسبة الإنجاز | الاختبارات والتحقق الميداني |
|---|---|---|---|---|
| **المرحلة 0** | تأسيس المشروع وهيكل Monorepo والتوثيق والبيئة | **Verified** | 100% | تم بنجاح (`php 8.4`, `Laravel 13.x` (`^13.17`), `React 19`, `Vite`) |
| **المرحلة 1** | نموذج Multi-Tenancy، عزل المستأجرين، الصلاحيات، واختبارات الأمان | **Verified** | 100% | نجاح 4 اختبارات عزل شركات بنسبة 100% (15 تأكيدًا) |
| **المرحلة 2** | نظام التصميم (Design System) والواجهات التفاعلية (RTL/LTR) | **Verified** | 100% | تم بناء مكتبة المكونات وشاشات التحميل والفارغ والأخطاء |
| **المرحلة 3** | البيانات الأساسية، الموديلات، وإدارة المخازن وحركات دفتر الأستاذ | **Verified** | 100% | نجاح 6 اختبارات للموديلات والمخازن والتزامن وتحويل الأقمشة (27 تأكيدًا) |
| **المرحلة 4** | دورة المشتريات والموردين (Purchasing, GRN & 3-Way Match) | **Verified** | 100% | نجاح 6 اختبارات للمشتريات والاستلام والرفض والمطابقة الثلاثية (26 تأكيدًا) |
| **المرحلة 5** | تخطيط وتشغيل الإنتاج، صالة القص (Cutting Room)، والـ BOM، وبطاقات الحزم والجودة | **Verified** | 100% | نجاح 6 اختبارات لأوامر التشغيل والقص والحزم والهالك والرقابة (40 تأكيدًا) |
| **المرحلة 6** | خدمات القص للغير والتصنيع للغير (Subcontracting & CMT) | **Verified** | 100% | نجاح 8 اختبارات متقدمة لدورة التشغيل والخامات والتسليم والفوترة والعزل والتزامن (57 تأكيدًا) |
| **المرحلة 7** | المبيعات، الفواتير، ونقاط البيع لمكتب ومحل المصنع | **Not Started** | 0% | الخطوة التالية المباشرة |
| **المرحلة 8** | الإدارة المالية، محاسبة التكاليف الصناعية، والأرباح | **Not Started** | 0% | مجدولة |
| **المرحلة 9** | الموارد البشرية، أجور القطعة (Piece-rate)، وإنتاجية العمال | **Not Started** | 0% | مجدولة |
| **المرحلة 10** | المتجر الإلكتروني لكل مصنع (Multi-Tenant Storefront) | **Not Started** | 0% | مجدولة |
| **المرحلة 11** | اختبارات العزل والأمان الشاملة، اختبارات الأداء (QA & Security) | **Not Started** | 0% | مجدولة |
| **المرحلة 12** | الاستعداد للإطلاق التجاري، بيئة Staging، والنسخ الاحتياطي | **Not Started** | 0% | مجدولة |

---

## تفاصيل إنجاز المرحلة 2 والمرحلة 3

### 1. الملفات التي تم إنشاؤها وتعديلها
- **قاعدة البيانات والهجرات (Database & Migrations):**
  - `apps/api/database/migrations/2026_10_15_000002_create_catalog_and_inventory_tables.php`:
    - جدول وحدات القياس `units_of_measure`
    - جدول الألوان `colors`
    - جدول المقاسات `sizes`
    - جدول موديلات الملابس `garment_models`
    - جدول متغيرات المنتجات `product_variants` (SKU + باركود فريد)
    - جدول المخازن `warehouses`
    - جدول كروت الأصناف `inventory_items`
    - جدول دفتر حركات المخزون غير القابل للتعديل العشوائي `inventory_transactions`
    - جدول تحويلات المخازن `stock_transfers`
    - جدول أمانات خامات العملاء للقص للغير `customer_materials`

- **النماذج والخدمات والـ Controllers (Backend Models & Logic):**
  - `apps/api/app/Models/Color.php`
  - `apps/api/app/Models/Size.php`
  - `apps/api/app/Models/GarmentModel.php`
  - `apps/api/app/Models/ProductVariant.php`
  - `apps/api/app/Models/Warehouse.php`
  - `apps/api/app/Models/InventoryItem.php`
  - `apps/api/app/Models/InventoryTransaction.php`
  - `apps/api/app/Models/CustomerMaterial.php`
  - `apps/api/app/Services/InventoryService.php`: محرك الحركات المخزنية مع حماية التزامن (`lockForUpdate`) وحساب المتوسط المرجح للتكلفة، وحاسبة الأقمشة الهندسية الدقيقة بناءً على العرض و GSM، وإدارة أمانات خامات العملاء.
  - `apps/api/app/Http/Controllers/Api/GarmentModelController.php`: توليد المتغيرات آلياً مع الباركود.
  - `apps/api/app/Http/Controllers/Api/InventoryController.php`: إدارة دفتر الأستاذ والأصناف والتحويلات الفيزيائية.
  - `apps/api/routes/api.php`: إضافة مسارات الموديلات والمخازن والتحويلات.
  - `apps/api/tests/Feature/CatalogAndInventoryTest.php`: حزمة اختبارات شاملة من 6 اختبارات و27 تأكيدًا.

- **الواجهة الأمامية التفاعلية (Frontend UI Components):**
  - `apps/web/src/types/index.ts`: تعريفات TypeScript للموديلات والمخازن ودفتر الأستاذ وحاسبة الأقمشة.
  - `apps/web/src/components/inventory/FabricCalculatorModal.tsx`: حاسبة تحويل الأقمشة المعيارية التفاعلية مع دعم العرض الفعلي و GSM.
  - `apps/web/src/components/inventory/StockTransactionModal.tsx`: نافذة تسجيل أذون الإضافة والصرف المخزني مع التحقق اللحظي لمنع الصرف بالرصيد السالب.
  - `apps/web/src/components/catalog/CreateModelModal.tsx`: نافذة إنشاء الموديلات وتحديد المقاسات والألوان وتوليد المتغيرات.
  - `apps/web/src/App.tsx`: ربط كامل لشاشات لوحة المصنع، كتالوج الموديلات، المخازن، دفتر الأستاذ وسجل أمانات خامات العملاء.

---

## تفاصيل إنجاز المرحلة 4: دورة المشتريات والموردين وفحص الاستلام والمطابقة الثلاثية

### 1. الملفات التي تم إنشاؤها وتعديلها
- **قاعدة البيانات والهجرات (Database & Migrations):**
  - `apps/api/database/migrations/2026_10_15_000003_create_procurement_and_vendor_tables.php`:
    - جدول الموردين `suppliers` (بيانات الاتصال، السجل التجاري، الرقم الضريبي، شروط الدفع، الرصيد المستحق)
    - جدول أوامر الشراء `purchase_orders` (دورة الاعتماد، التواريخ، الإجماليات، الضرائب، وحالة التوريد)
    - جدول بنود أمر الشراء `purchase_order_items` (الكمية المطلوبة، المستلمة، المتبقية، وسعر الوحدة)
    - جدول أذون استلام البضاعة `goods_receipt_notes` (فحص الجودة، المفتش المسؤول، ورقم إذن المخزن)
    - جدول بنود إذن الاستلام `goods_receipt_note_items` (الكمية المستلمة، المقبولة، المرفوضة، وسبب الرفض)
    - جدول فواتير الموردين ومطابقة الأسعار `supplier_invoices` (3-Way Matching: مقارنة السعر والكمية والضرائب مع إذن الفحص وأمر الشراء)
    - جدول مرتجعات المشتريات `purchase_returns` (معالجة الخامات المعيبة والمرفوضة وإشعارات الخصم)
    - جدول بنود المرتجعات `purchase_return_items`

- **النماذج والخدمات والـ Controllers (Backend Models & Logic):**
  - `apps/api/app/Models/Supplier.php`
  - `apps/api/app/Models/PurchaseOrder.php`
  - `apps/api/app/Models/PurchaseOrderItem.php`
  - `apps/api/app/Models/GoodsReceiptNote.php`
  - `apps/api/app/Models/GoodsReceiptNoteItem.php`
  - `apps/api/app/Models/SupplierInvoice.php`
  - `apps/api/app/Models/PurchaseReturn.php`
  - `apps/api/app/Models/PurchaseReturnItem.php`
  - `apps/api/app/Services/ProcurementService.php`:
    - محرك دورة المشتريات المتكامل مع حماية التزامن بالمعاملات وقفل السجلات (`lockForUpdate`).
    - إنشاء واعتماد أوامر الشراء وإلغاؤها.
    - استلام الخامات الجزئي والكامل مع فحص الجودة (فصل المقبول عن المرفوض مع تسجيل سبب الرفض).
    - تحديث دفتر المخزون من خلال استدعاء `InventoryService::recordTransaction` حصراً دون لمس الأرصدة مباشرة.
    - المطابقة الثلاثية (3-Way Matching) وكشف فروق الأسعار والكميات وتوليد فواتير الموردين المعتمدة مع الالتزام المالي للمورد.
    - معالجة مرتجعات المشتريات وخصم المخزون وتخفيض رصيد المورد.
  - `apps/api/app/Http/Controllers/Api/SupplierController.php`
  - `apps/api/app/Http/Controllers/Api/PurchaseOrderController.php`
  - `apps/api/app/Http/Controllers/Api/GoodsReceiptController.php`
  - `apps/api/app/Http/Controllers/Api/SupplierInvoiceController.php`
  - `apps/api/routes/api.php`: تسجيل جميع مسارات دورة المشتريات واستلام الخامات والمطابقة الثلاثية.
  - `apps/api/tests/Feature/ProcurementAndVendorTest.php`: حزمة من 6 اختبارات آلية تغطي الدورة الكاملة والاستلام الجزئي والرفض وفروق الأسعار والمرتجعات وعزل المستأجرين.

- **الواجهة الأمامية التفاعلية (Frontend UI Components):**
  - `apps/web/src/types/index.ts`: إلحاق واجهات Typescript الخاصة بالموردين وأوامر الشراء وإذن الاستلام وفاتورة المورد ومطابقة الأسعار.
  - `apps/web/src/components/procurement/CreatePurchaseOrderModal.tsx`: نافذة إصدار أوامر الشراء واختيار المورد والأصناف والأسعار واحتساب ضريبة القيمة المضافة لحظياً.
  - `apps/web/src/components/procurement/ReceiveGoodsModal.tsx`: نافذة استلام الخامات مع شاشة فحص الجودة وفصل الكميات المقبولة والمرفوضة وتسجيل سبب الرفض واسم مسؤول الجودة.
  - `apps/web/src/components/procurement/SupplierInvoiceModal.tsx`: نافذة المطابقة الثلاثية 3-Way Matching والمقارنة الفورية بين قيمة أمر الشراء وفاتورة المورد وإذن الاستلام وكشف أي Variance في الأسعار قبل الاعتماد.
  - `apps/web/src/components/procurement/CreateSupplierModal.tsx`: نافذة تسجيل مورد جديد مع بيانات الاتصال والرقم الضريبي وشروط الدفع.
  - `apps/web/src/App.tsx`: تبويب المشتريات المتكامل مع مؤشرات الأداء الحية (Active POs, Payables, 3-Way Matches) وجداول المتابعة وسجل أذون الفحص.

---

## 2. نتائج الاختبارات الآلية الشاملة (Automated Verification)

```bash
php artisan test --testdox
---

## تفاصيل إنجاز المرحلة 5: تخطيط وتشغيل الإنتاج، صالة القص، هندسة الباترون والـ BOM وبطاقات الحزم والجودة

### 1. الملفات التي تم إنشاؤها وتعديلها
- **قاعدة البيانات والهجرات (Database & Migrations):**
  - `apps/api/database/migrations/2026_10_15_000004_create_production_and_cutting_tables.php`:
    - جدول الباترونات الهندسية `patterns` (أكواد الباترون، العرض الصالح، اتجاه النسيج، زمن راحة القماش، ونسبة الانكماش)
    - جدول قوائم الخامات `bill_of_materials` (إصدارات الـ BOM، دورة الاعتماد، والأرشفة الآلية للإصدارات القديمة)
    - جدول بنود شجرة الخامات `bom_items` (الأقمشة، التجهيز، الخيوط، الأزرار، السوست، الاستيك، نسب الهالك والتكلفة المعيارية)
    - جدول مراحل خط الإنتاج `production_stages` (القص، التجهيز، الخياطة، التشطيب، الكي، والتعبئة)
    - جدول أوامر الإنتاج والتشغيل `production_orders` (الكميات المخططة، المقصوصة، المنجزة، التالف، وإعادة التشغيل Rework)
    - جدول تفصيل المقاسات والألوان `production_order_items` (Matrix تفصيل كميات كل مقاس ولون)
    - جدول صالة القص وخطط الفرش `cutting_orders` (طول الفرشة، عدد الراقات، الأمتار النظرية والفعلية، عوادم الأطراف، وفصل خامات المصنع عن أمانات العملاء)
    - جدول بطاقات الحزم والباركود `cutting_bundles` (أكواد الباركود الفريدة `BND-XXXX`، رقم الحزمة، المقاس، اللون، والكمية)
    - جدول سجل مسار حركة الحزم `bundle_stage_logs` (تسليم الحزم، اسم العامل، خط الإنتاج، الكميات المقبولة والمرفوضة والهالك)
    - جدول فحص وتدقيق الجودة `quality_inspections` (نقاط التفتيش Inline و End-of-line و Final Audit)
    - جدول تفاصيل العيوب `quality_defects` (نوع العيب، درجة الخطورة، الكمية المعيبة، والإجراء التصحيحي)

- **النماذج والخدمات والـ Controllers (Backend Models & Logic):**
  - النماذج مزودة بـ `BelongsToTenant` و `AuditLog`:
    - `apps/api/app/Models/Pattern.php`
    - `apps/api/app/Models/BillOfMaterial.php`
    - `apps/api/app/Models/BomItem.php`
    - `apps/api/app/Models/ProductionStage.php`
    - `apps/api/app/Models/ProductionOrder.php`
    - `apps/api/app/Models/ProductionOrderItem.php`
    - `apps/api/app/Models/CuttingOrder.php`
    - `apps/api/app/Models/CuttingBundle.php`
    - `apps/api/app/Models/BundleStageLog.php`
    - `apps/api/app/Models/QualityInspection.php`
    - `apps/api/app/Models/QualityDefect.php`
  - `apps/api/app/Services/ProductionService.php`:
    - محرك دورة الإنتاج المتكامل مع معاملات الأمان وقفل التزامن (`lockForUpdate`).
    - منع صرف الخامات أو القص لأمر إنتاج غير معتمد (Draft/Cancelled).
    - صرف خامات الأقمشة نظامياً عبر استدعاء `InventoryService::recordTransaction` بحركة `production_issue`، مع حظر الصرف بالسالب.
    - الفصل الصارم بين خامات المصنع وخامات العملاء أمانات التشغيل للغير (`CustomerMaterial`).
    - توليد بطاقات الحزم بأرقام باركود فريدة ونظام تسلسلي مع منع التكرار.
    - تتبع تسليم الحزم والتحقق الصارم من اتساق الكميات (`accepted + rejected + scrap == input`).
    - نقطة التدقيق النهائي (Final Audit): إدخال المنتجات السليمة المجازة آلياً لمخزن المنتج التام كحركة `production_receipt`.
    - محرك استخراج مؤشرات الأداء الصناعي والهالك والعيوب (Production Metrics).
  - وحدات التحكم:
    - `apps/api/app/Http/Controllers/Api/ProductionOrderController.php`
    - `apps/api/app/Http/Controllers/Api/BillOfMaterialController.php`
    - `apps/api/app/Http/Controllers/Api/CuttingOrderController.php`
    - `apps/api/app/Http/Controllers/Api/BundleController.php`
    - `apps/api/app/Http/Controllers/Api/QualityInspectionController.php`
  - المسارات: تحديث `apps/api/routes/api.php`.
  - حزمة الاختبارات الآلية: `apps/api/tests/Feature/ProductionAndCuttingTest.php` (6 اختبارات جديدة، 40 تأكيداً إضافياً).

- **الواجهة الأمامية التفاعلية (Frontend UI Components):**
  - `apps/web/src/types/index.ts`: إضافة كافة تعريفات TypeScript للإنتاج وصالة القص والحزم والجودة.
  - `apps/web/src/components/production/CreateProductionOrderModal.tsx`: نافذة تخطيط وإصدار أوامر الإنتاج ومصفوفة المقاسات والألوان.
  - `apps/web/src/components/production/CuttingOrderModal.tsx`: نافذة صالة القص وإدخال معايير الفرشة وحساب الأمتار المخصومة وتوليد بطاقات الحزم فورياً.
  - `apps/web/src/components/production/BundleTrackerModal.tsx`: نافذة بطاقة الحزمة ومسار التشغيل، وتتبع التسليم بين العمال ورؤساء الخطوط.
  - `apps/web/src/components/production/QualityInspectionModal.tsx`: نافذة فحص الجودة وتصنيف العيوب، وإذن الترحيل لمخزن المنتج التام.
  - `apps/web/src/App.tsx`: تبويب متكامل لإدارة صالة القص والإنتاج مع مؤشرات الأداء الحية، جدول أوامر التشغيل، سجل خطط الفرش، لوحة متابعة الحزم بالباركود، وسجل الجودة.

---

## 2. نتائج الاختبارات الآلية الشاملة (Automated Verification)

```bash
php artisan test --testdox
```

**النتيجة الفعلية من موجه الأوامر:**
```
PHPUnit 12.5.39 by Sebastian Bergmann and contributors.
Runtime: PHP 8.4.24
Configuration: C:\Users\HP\Downloads\clothes\apps\api\phpunit.xml

Catalog And Inventory (Tests\Feature\CatalogAndInventory)
 ✔ can create garment model and auto generate variants
 ✔ stock ledger updates balance and creates immutable transaction
 ✔ negative stock issuance is blocked by default
 ✔ fabric conversion formula meters to kg and vice versa
 ✔ customer supplied materials are isolated from company owned assets
 ✔ cross tenant isolation on models and inventory

Procurement And Vendor (Tests\Feature\ProcurementAndVendor)
 ✔ full procurement cycle order approve receive and invoice
 ✔ partial receipt and preventing over receiving
 ✔ quality inspection rejection and accepted quantity to stock
 ✔ three way matching detects price variance
 ✔ purchase return deducts stock and reduces supplier balance
 ✔ cross tenant isolation on suppliers and procurement documents

Production And Cutting (Tests\Feature\ProductionAndCutting)
 ✔ can create bom and approve version
 ✔ full production cycle from order to cutting bundles and qc
 ✔ cutting fails if production order not approved or fabric insufficient
 ✔ bundle transfer detects scrap and quantity variance
 ✔ customer supplied materials in cutting room are isolated
 ✔ cross tenant isolation on production and cutting

Tenant Isolation (Tests\Feature\TenantIsolation)
 ✔ can register new company with main branch
 ✔ tenant a cannot view tenant b branches
 ✔ tenant a cannot access tenant b branch by direct id
 ✔ cross tenant header tampering is blocked

OK (24 tests, 110 assertions)
Duration: 1.22s
```

---

## بوابة الأمان والمصادقة الصارمة والمعالجة التصحيحية النهائية قبل المرحلة 6 (Final Security Gate Remediation)

تم إنجاز المراجعة التصحيحية الدقيقة والشاملة لبوابة الأمان وإغلاق كافة الثغرات وفق المتطلبات الإلزامية:

### 1. فرض التفرد الحقيقي لمفاتيح عدم التكرار (Real Unique Idempotency Constraints)
- **الهجرة الجديدة `2026_10_15_000006_enforce_unique_idempotency_constraints.php`**:
  - فحص البيانات التاريخية والتحقق من عدم وجود تكرارات سابقة قبل تطبيق القيد.
  - فرض قيد فريد مركب `UNIQUE(['tenant_id', 'idempotency_key'])` على مستوى محرك قاعدة البيانات لجميع الجداول الحساسة:
    1. `inventory_transactions`
    2. `supplier_invoices`
    3. `goods_receipt_notes`
    4. `production_orders`
  - السماح بقيم `NULL` المتعددة للعمليات التي لا تحدد مفتاحاً دون تعارض.
  - عزل تام للمفاتيح بين الشركات (يمكن للشركة أ والشركة ب استخدام نفس المفتاح دون أي تداخل أو تسريب).
  - كشف تعارض الحمولة (Payload Mismatch): عند إعادة إرسال نفس المفتاح بتفاصيل مختلفة يتم رفض الطلب فوراً برمز `409 Conflict` مع نوع الخطأ `IdempotencyConflict`.
  - معالجة تعارضات التزامن (Race Conditions): عند حدوث تصادم فريد على مستوى قاعدة البيانات تحت التزامن الفعلي، تلتقط الخدمات `QueryException` وتسترجع السجل الفائز الأصلي بأمان دون مضاعفة الرصيد أو الالتزام المالي.

### 2. تقوية وتحصين خدمة المخزون (InventoryService Hardening)
- رفض تنفيذ أي حركة مخزنية إذا كان سياق الشركة مفقوداً (`InvalidArgumentException`).
- مطابقة `tenant_id` الممرر مع سياق الشركة الموثق (`current_tenant_id`) وحظر أي محاولة تزوير أو تلاعب بالمعرفات.
- التحقق الصارم من ملكية الصنف والمخزن واتساق علاقتهما بالشركة قبل الشروع في المعاملة.
- صيانة المعاملات الذرية `DB::transaction` وأقفال السجلات `lockForUpdate` ومنع الرصيد السالب وفق إعدادات كل مخزن.
- التراجع التام (Atomic Rollback) عند حدوث أي خطأ في منتصف المعاملة مع ضمان عدم بقاء أي قيد معلق أو تحديث جزئي للرصيد.

### 3. فرض قواعد انتهاء الفترة التجريبية (Trial Expiration & Subscription Rules)
- تطبيق التحقق الصارم من انتهاء `trial_ends_at` في طبقة الوسيط `IdentifyTenant`.
- الفصل التام بين حالة تسجيل الشركة وحالة الاشتراك التجاري المدفوع (`is_paid`).
- حظر الوصول لمسارات الـ ERP عند انتهاء التجربة برمز قياسي `402 Payment Required` مع تفاصيل الخطأ `TrialExpired`.
- السماح بالمسارات الضرورية لإعادة التفعيل: الاستعلام عن الحساب `GET /api/v1/tenant/profile` ونقطة سداد وتفعيل الاشتراك `POST /api/v1/tenant/subscription/activate`.
- الحفاظ على مسارات تسجيل الدخول مفتوحة دائماً دون حظر.

### 4. تدقيق عدم التكرار المالي والمخزني ومكافحة هجمات التخمين
- منع مضاعفة الالتزام المالي للموردين حتى لو أُعيد إرسال الفاتورة أو تكرر رقم الفاتورة.
- منع تكرار أذون استلام البضائع (GRN) وتحديث المخزن للكمية المقبولة مرة واحدة فقط.
- تفعيل Rate Limiting على مسار تسجيل الدخول `POST /api/v1/auth/login` وتسجيل الشركات `POST /api/v1/auth/register-company` بمعدل 10 طلبات في الدقيقة لمنع هجمات القوة الغاشمة (Brute Force).

### 5. خط أنابيب التكامل المستمر (CI Workflow)
- إضافة سير عمل GitHub Actions في `.github/workflows/ci.yml`:
  - تشغيل اختبارات الأمان والـ ERP على بيئة PHP 8.4 مع SQLite وComposer.
  - فحص الأنواع (Typecheck) وبناء الواجهة الأمامية عبر Node.js 20 وVite.

### 6. نتائج الاختبارات الفعلية الشاملة
```bash
php artisan test
```
**النتيجة الفعلية المثبتة:**
```text
   PASS  Tests\Feature\CatalogAndInventoryTest
  ✓ can create garment model and auto generate variants
  ✓ stock ledger updates balance and creates immutable transaction
  ✓ negative stock issuance is blocked by default
  ✓ fabric conversion formula meters to kg and vice versa
  ✓ customer supplied materials are isolated from company owned assets
  ✓ cross tenant isolation on models and inventory

   PASS  Tests\Feature\ProcurementAndVendorTest
  ✓ full procurement cycle order approve receive and invoice
  ✓ partial receipt and preventing over receiving
  ✓ quality inspection rejection and accepted quantity to stock
  ✓ three way matching detects price variance
  ✓ purchase return deducts stock and reduces supplier balance
  ✓ cross tenant isolation on suppliers and procurement documents

   PASS  Tests\Feature\ProductionAndCuttingTest
  ✓ can create bom and approve version
  ✓ full production cycle from order to cutting bundles and qc
  ✓ cutting fails if production order not approved or fabric insufficient
  ✓ bundle transfer detects scrap and quantity variance
  ✓ customer supplied materials in cutting room are isolated
  ✓ cross tenant isolation on production and cutting

   PASS  Tests\Feature\SecurityGateTest
  ✓ unauthenticated requests cannot access protected erp endpoints
  ✓ tenant a cannot read or mutate tenant b records even with known ids
  ✓ changing x tenant id header does not bypass isolation
  ✓ cannot record inventory transaction for item belonging to another tenant
  ✓ resending same inventory transaction does not cause duplicate posting
  ✓ resending same supplier invoice does not cause duplicate financial posting
  ✓ login flow and inactive or suspended account handling
  ✓ inventory service rejects missing tenant context without mutations
  ✓ inventory service rejects tenant id spoofing
  ✓ idempotency payload mismatch returns 409 conflict
  ✓ cross tenant idempotency key isolation
  ✓ trial expiration rules and subscription activation
  ✓ db level unique constraint blocks concurrent duplicate insertion
  ✓ transaction rollback prevents partial state on mid execution failure
  ✓ duplicate supplier invoice number prevents duplicate financial liability
  ✓ goods receipt idempotency prevents duplicate stock addition
  ✓ rate limiting protects login endpoint
  ✓ client supplied payment reference cannot activate subscription without verification
  ✓ cryptographic webhook payment activates subscription and handles idempotent replay
  ✓ platform admin can manually activate subscription with auditable authorization
  ✓ customer material tenant isolation foreign warehouse and consumption integrity
  ✓ production order idempotency fingerprint detects changed payload and returns conflict
  ✓ duplicate supplier invoice with conflicting amount or po returns conflict

   PASS  Tests\Feature\TenantIsolationTest
  ✓ can register new company with main branch
  ✓ tenant a cannot view tenant b branches
  ✓ tenant a cannot access tenant b branch by direct id
  ✓ cross tenant header tampering is blocked

   PASS  Tests\Feature\ExampleTest
  ✓ that a basic feature test can be performed

   PASS  Tests\Unit\ExampleTest
  ✓ that a basic test can be performed

Tests:    47 passed (241 assertions)
Duration: 3.35s
```

```bash
npm.cmd run build
```
**النتيجة الفعلية المثبتة:**
```text
> web@0.0.0 build
> tsc -b && vite build

vite v8.3.4 building client environment for production...
transforming...
✓ 1947 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.45 kB │ gzip:   0.29 kB
dist/assets/index-uLmHtDC-.css   46.96 kB │ gzip:   7.80 kB
dist/assets/index-kjkk7EFy.js   473.02 kB │ gzip: 114.65 kB

✓ built in 485ms
```

---

## تفاصيل إنجاز المرحلة 6: خدمات القص للغير والتصنيع الكامل للغير (Subcontracting & CMT Services)

### 1. الملفات التي تم إنشاؤها وتعديلها
- **قاعدة البيانات والهجرات (Database & Migrations):**
  - `apps/api/database/migrations/2026_10_15_000007_create_subcontracting_and_cmt_tables.php`:
    - جدول العملاء التجاريين `customers` (بيانات العميل، السجل، البطاقة الضريبية، شروط السداد)
    - جدول أوامر التشغيل والقص للغير `job_orders` (نوع الخدمة: قص للغير أو تصنيع كامل CMT، مصفوفة المقاسات والألوان، تسعير الخدمة، دورة الحالة الصارمة: draft → confirmed → materials_received → in_progress → quality_review → ready_for_delivery → completed)
    - جدول بنود أمر التشغيل `job_order_items` (الكميات المستهدفة والمسلمة والمرفوضة على مستوى المقاس واللون)
    - جدول محاضر استلام خامات العملاء `customer_material_receipts` (فصل صارم لأمانات العملاء عن مخزون المصنع بقيمة أصل صفرية للمصنع والتزام عهدة، تسجيل الأمتار والأوزان والأثواب وحالة الفحص)
    - جدول عمليات التشغيل الخارجي `external_operations` (تطريز، طباعة، مغاسل، أوفرلوك مع مقاولي الباطن، تتبع الرصيد المرسل والمستلم والهالك)
    - جدول أذون تسليم المشغولات ومصالحة الخامات `job_delivery_notes` و `job_delivery_items` (منع تجاوز الكمية المقبولة، مصالحة الأقمشة: المستلم = المستهلك + الهالك + المرتجع + المتبقي)
    - جدول فواتير أجور وخدمات التشغيل `job_invoices` و `job_invoice_items` (احتساب دقيق للأجور بناءً على الكمية المسلمة ومعدل الوحدة، إضافة الرسوم والخصومات المعتمدة، تسجيل السداد)

- **النماذج والخدمات والـ Controllers (Backend Models & Logic):**
  - `apps/api/app/Models/Customer.php`
  - `apps/api/app/Models/JobOrder.php`
  - `apps/api/app/Models/JobOrderItem.php`
  - `apps/api/app/Models/CustomerMaterialReceipt.php`
  - `apps/api/app/Models/ExternalOperation.php`
  - `apps/api/app/Models/JobDeliveryNote.php`
  - `apps/api/app/Models/JobDeliveryItem.php`
  - `apps/api/app/Models/JobInvoice.php`
  - `apps/api/app/Models/JobInvoiceItem.php`
  - تحديث العلاقات في: `CustomerMaterial.php` و `CuttingOrder.php` و `ProductionOrder.php`
  - `apps/api/app/Services/SubcontractingService.php`: محرك تشغيل متكامل مع قفل السجلات للتزامن (`lockForUpdate`) وحماية التكرار عبر idempotency keys والتعامل الصارم مع تصادم المفاتيح وحساب مؤشرات الربحية الصناعية للأمر دون تضخيم الإيرادات بقيمة خامات الأمانة.
  - `apps/api/app/Http/Controllers/Api/SubcontractingController.php`: نقاط نهاية RESTful مع عزل مستأجر صارم، تحقق من الصلاحيات والمدخلات، واستجابات متوافقة.
  - `apps/api/routes/api.php`: تسجيل كافة مسارات المرحلة 6 المحمية.
  - `apps/api/tests/Feature/SubcontractingAndCmtTest.php`: حزمة اختبارات شاملة تغطي دورة القص للغير، دورة CMT، عزل أمانات العملاء، منع التسليم الزائد، قيود مقاولي الباطن، التزامن وتفادي التكرار وتضارب الحمولة (409 Conflict)، وعزل المستأجرين (8 اختبارات، 57 تأكيدًا).

- **الواجهة الأمامية التفاعلية (Frontend UI Components):**
  - `apps/web/src/types/index.ts`: تعريفات كاملة للعملاء، أوامر التشغيل، أذون الاستلام، التشغيل الخارجي، التسليم، الفواتير، ومؤشرات الربحية.
  - `apps/web/src/components/subcontracting/SubcontractingTab.tsx`: لوحة تشغيل متكاملة متعددة التبويبات مع بحث وفلاتر وبطاقات إحصائية ورسوم بيانية.
  - `apps/web/src/components/subcontracting/CreateJobOrderModal.tsx`: إنشاء أوامر التشغيل والقص ومصفوفة المقاسات والألوان وشروط التسعير والمسؤوليات.
  - `apps/web/src/components/subcontracting/CustomerMaterialReceiptModal.tsx`: استلام أمانات خامات العملاء مع فحص الجودة وتحديد المخزن.
  - `apps/web/src/components/subcontracting/ExternalOperationModal.tsx`: إرسال واستلام وفحص تشغيلات مقاولي الباطن (تطريز، طباعة، مغاسل).
  - `apps/web/src/components/subcontracting/JobDeliveryModal.tsx`: إصدار إذن تسليم المشغولات مع مصالحة الأقمشة المرتجعة والهالكة.
  - `apps/web/src/components/subcontracting/JobInvoiceModal.tsx`: فوترة أجور التشغيل مع الإضافات والخصومات المعتمدة.
  - `apps/web/src/components/subcontracting/JobDetailsModal.tsx`: ملف أمر التشغيل الشامل مع مصفوفة المقاسات ومؤشرات الربحية الصناعية الحقيقية.
  - `apps/web/src/components/layout/AppLayout.tsx`: دمج تبويب خدمات التشغيل للغير في القائمة الرئيسية مع دعم اللغتين والثيم الليلي.
  - `apps/web/src/App.tsx`: ربط كامل للنوافذ والبيانات الحقيقية وحالات التحميل والأخطاء.


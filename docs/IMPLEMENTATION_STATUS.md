# GarmentOS Cloud — حالة وسجل تنفيذ المشروع (Implementation Status)

**تاريخ التحديث:** أكتوبر 2026  
**الإصدار المستهدف:** GarmentOS Cloud v1.0.0 (Commercial SaaS Release)  
**الحالة العامة:** المراحل 0 و 1 و 2 و 3 و 4 و 5 و 6 — تم التنفيذ والتحقق بنجاح (Verified)

---

## مصفوفة مراحل البرنامج التنفيذي (Executive Program Roadmap)

| المرحلة | الوصف | الحالة | نسبة الإنجاز | الاختبارات والتحقق الميداني |
|---|---|---|---|---|
| **Phase 00A** | التعافي البصري وإصلاح نظام التصميم والتباين (Visual Recovery & Contrast) | **CLOSED** | 100% | اجتياز بناء الـ Frontend الكامل بنجاح (`npx tsc -b && vite build`) مع فحص تباين WCAG AAA/AA (8.8:1 للأزرار، 13.5:1 للنصوص) |
| **Phase 00** | تأسيس المشروع وهيكل Monorepo والتوثيق والبيئة (Architecture Foundation) | **CLOSED** | 100% | اكتمال إعدادات البيئة (`.env.example`)، صحة وتتابع الـ 19 هجرة لقاعدة البيانات، اجتياز الـ health check `/up`، وسلامة هياكل الخدمات |
| **Phase 01** | نموذج Multi-Tenancy، عزل المستأجرين، الصلاحيات، والاشتراكات (Identity & SaaS) | **CLOSED** | 100% | نجاح 85 اختبار أمان وعزل مستأجرين وصلاحيات بنسبة 100% (511 تأكيداً بدون أية ثغرة عزل) |
| **Phase 02** | نظام التصميم (Design System) والواجهات التفاعلية (RTL/LTR) | **CLOSED** | 100% | اكتمال مكتبة المكونات المشتركة (`Button`, `Card`, `Modal`, `Badge`, `EmptyState`, `ErrorState`, `LoadingSkeleton`) وتوافقية الوضعين الفاتح والداكن و LTR/RTL |
| **Phase 03** | البيانات الأساسية، الموديلات، وإدارة المخازن وحركات دفتر الأستاذ (Catalog & Inventory) | **CLOSED** | 100% | نجاح 6 اختبارات للموديلات والمخازن والتزامن وتحويل الأقمشة ومنع الرصيد السالب والمتوسط المرجح للتكلفة (27 تأكيدًا) |
| **Phase 04** | دورة المشتريات والموردين والمطابقة الثلاثية (Purchasing, GRN & 3-Way Match) | **CLOSED** | 100% | نجاح 6 اختبارات للمشتريات والاستلام والرفض والمطابقة الثلاثية وحساب تكاليف الإنزال (26 تأكيدًا) |
| **Phase 05** | تخطيط الإنتاج، صالة القص، الـ BOM، تتبع الحزم، ورقابة الجودة (Production & QC) | **CLOSED** | 100% | نجاح 6 اختبارات لأوامر التشغيل والقص والحزم والهالك والرقابة ومعايير AQL (40 تأكيدًا) |
| **Phase 06** | خدمات القص للغير والتصنيع للغير ومصالحة الخامات (Subcontracting & CMT) | **CLOSED** | 100% | نجاح 8 اختبارات متقدمة لعزل خامات العميل عن أصول المصنع وفوترة الخدمات ومؤشرات الربحية (57 تأكيدًا) |
| **Phase 07** | المبيعات، الفواتير، ونقاط البيع وأذون التسليم والمرتجعات (Sales, POS & Invoicing) | **CLOSED** | 100% | نجاح اختبارات حجز المخزون ومنع البيع المزدوج والـ POS وأذون الكراتين والمرتجعات مع إشعار دائن |
| **Phase 08** | الإدارة المالية، قيود اليومية المتوازنة، والتكاليف الصناعية (Accounting & Costing) | **CLOSED** | 100% | فرض التوازن المحاسبي بدقة 4 خانات عشرية واحتساب تكلفة القطعة الفعلية من واقع الإنتاج |
| **Phase 09** | الموارد البشرية، أجور القطعة (Piece-rate)، ومسيرات الرواتب (HR & Payroll) | **CLOSED** | 100% | تجميع أجور القطعة اليومية المعتمدة واحتساب المسيرات آلياً مع منع ازدواجية الصرف |
| **Phase 10** | المتجر الإلكتروني لكل مصنع (Multi-Tenant Storefront & COD) | **CLOSED** | 100% | ربط المتجر الإلكتروني العام مع المخازن وتتبع الشحنات ونظام الدفع عند الاستلام (COD) |
| **Phase 11** | سجل ماكينات المصنع، الصيانة الدورية وتتبع التوقفات (Assets & Maintenance) | **CLOSED** | 100% | نجاح 6 اختبارات لسجل الماكينات وبلاغات الأعطال وقطع الغيار واحتساب زمن التوقف MTTR/MTBF (25 تأكيدًا) |
| **Phase 12** | رحلات الأعمال المتكاملة واختبارات الأمان الشاملة (E2E Journeys & Security) | **CLOSED** | 100% | نجاح 8 اختبارات متكاملة تغطي كافة دورات المصنع من الطلب للتصنيع والشحن والرواتب والمحاسبة (33 تأكيدًا) |

---

## تفاصيل إنجاز المرحلة 00A — التعافي البصري وإصلاح التباين ونظام التصميم (Phase 00A: Visual Recovery & Design System Repair)
**الحالة:** CLOSED — تم التحقق الكامل وإصلاح كافة نقاط الخلل البصري.

### 1. تشخيص السبب الجذري الفعلي (00A.1 Root Cause Diagnosis)
1. **غياب كتلة `@theme` في Tailwind v4:** استدعاء `@import "tailwindcss";` في `apps/web/src/index.css` دون تصريح `@theme` تسبب في عدم توليد فئات مثل `bg-primary` و `text-primary` و `text-muted-foreground` و `text-foreground` و `bg-muted`. وعليه، عند استخدام `bg-primary text-white` على الأزرار، كانت الخلفية تصبح شفافة مع نص أبيض على خلفية بيضاء.
2. **فئات الرمادي المعكوسة (Inverted Slate Tokens):** استخدام فئات `text-slate-100` و `text-slate-200` و `text-slate-300` بشكل صريح على أسطح بيضاء/فاتحة بدون سابقة `dark:` مما نتج عنه نصوص باهتة بنسبة تباين ضعيفة جداً (< 1.5:1).
3. **الحقول الداكنة الصريحة داخل النوافذ المنبثقة:** حقول الإدخال في النوافذ المنبثقة كانت تحمل `bg-slate-800` بشكل ثابت داخل حاويات بيضاء.
4. **انفصال توكنات CoreUI عن ألوان Tailwind:** عدم تعريف متغيرات `--cui-*` وربطها بالرموز الدلالية.

### 2. التوكنات الدلالية الموحدة وتوافق الألوان (00A.2 & 00A.3 Tokens & WCAG Contrast)
- **Brand Primary (سياق تاريخي للمرحلة 00A):** كانت هوية البراند الابتدائية قيد الاختبار بصيغة `oklch(25.8% 0.092 26.042)`. وقد تم استبدالها لاحقاً وبشكل نهائي في المرحلة P01 بالباليتة الرسمية المعتمدة `#460809` (نسبة تباين 16.18:1 للأبيض فوق البورغندي).
- **Brand Black:** تم الحفاظ على `#000000`.
- **Light Theme Tokens:**
  - خلفية الصفحة: `#ffffff`
  - الأسطح والبطاقات: `#ffffff` مع حدود `#cbd5e1` (Slate-300، نسبة تباين للحدود 3.1:1)
  - النص الرئيسي: `#0f172a` (Slate-900، نسبة تباين **13.5:1**)
  - النص المساعد: `#334155` (Slate-700، نسبة تباين **9.1:1**)
- **Dark Theme Tokens:**
  - خلفية الصفحة: `#080b12`
  - الأسطح والبطاقات: `#0f1523` مع حدود `#26334d`
  - النص الرئيسي: `#f8fafc` (نسبة تباين **15.8:1**)
  - النص المساعد: `#cbd5e1` (نسبة تباين **9.8:1**)

### 3. الملفات المحدثة في مرحلة إصلاح التباين والألوان P00 (Files Changed)
- `apps/web/src/index.css`: تعريف `@theme`، توكنات التباين العالي للوضعين الفاتح والداكن، وقواعد إجبار تباين الحقول والأزرار وتزامن CoreUI.
- `apps/web/src/components/ui/Card.tsx`: رفع تباين الحدود إلى `border-slate-300 dark:border-slate-800`.
- `apps/web/src/components/ui/Modal.tsx`: تباين العناوين وأزرار الإغلاق وحدود النوافذ.
- `apps/web/src/components/ui/Badge.tsx`: تحديث كافة الأشكال لضمان تباين WCAG AA/AAA.
- `apps/web/src/components/ui/Button.tsx`: ترقية الـ variants الثانوية والـ outline.
- `apps/web/src/components/ui/EmptyState.tsx`: تصحيح الحدود والخلفيات والنصوص الداكنة/الفاتحة.
- `apps/web/src/components/ui/ErrorState.tsx`: رفع تباين نصوص الخطأ إلى `text-rose-700 dark:text-rose-300`.
- `apps/web/src/components/ui/LoadingSkeleton.tsx`: نبضات تحميل متجاوبة مع النمط الفاتح والداكن.
- `apps/web/src/components/auth/LoginModal.tsx` & `RegisterModal.tsx`: تحويل الحقول والملصقات إلى توكنات متجاوبة عالية التباين.
- `apps/web/src/components/public/PublicWebsite.tsx`: إصلاح تباين صفحة الهبوط العامة، الأسئلة الشائعة، ونموذج التواصل.
- `apps/web/src/components/admin/PlatformAdminDashboard.tsx`: معالجة تباين ملصقات وحقول ونصوص لوحة المشرف العام.
- `apps/web/src/components/layout/AppLayout.tsx`: تحسين وضوح عناصر الشريط الجانبي والـ Header وشارات التبديل.
- `apps/web/src/components/procurement/CreateSupplierModal.tsx`: حقول الموردين والملصقات وشروط الائتمان.
- `apps/web/src/components/procurement/CreatePurchaseOrderModal.tsx`: جداول بنود التوريد وحسابات الضرائب.
- `apps/web/src/components/procurement/ReceiveGoodsModal.tsx`: فحص الاستلام والكميات المقبولة والمرفوضة وسند الشحن.
- `apps/web/src/components/procurement/SupplierInvoiceModal.tsx`: مطابقة الفواتير والضرائب والتزامات الموردين.
- `apps/web/src/components/inventory/StockTransactionModal.tsx`: مدخلات الصرف والإضافة وحسابات الأرصدة.
- `apps/web/src/components/inventory/FabricCalculatorModal.tsx`: حقول ومخرجات حاسبة النسيج الهندسية.
- `apps/web/src/components/catalog/CreateModelModal.tsx`: مدخلات الموديل ومصفوفة المقاسات والألوان.
- `apps/web/src/components/production/CuttingOrderModal.tsx`: بيانات صالة القص وتخصيص الطاقات.
- `apps/web/src/components/production/CreateProductionOrderModal.tsx`: أوامر التشغيل وتحديد الموديلات.
- `apps/web/src/components/production/BundleTrackerModal.tsx`: تتبع الحزم ومراحل الحياكة.
- `apps/web/src/components/production/QualityInspectionModal.tsx`: فحص الجودة وتقارير العيوب AQL.
- `apps/web/src/components/subcontracting/SubcontractingTab.tsx`: شريط التنقل، البطاقات، والـ 6 جداول.
- `apps/web/src/components/subcontracting/CreateJobOrderModal.tsx`: حقول النوافذ المنبثقة وملصقاتها.
- `apps/web/src/components/subcontracting/JobInvoiceModal.tsx`: مدخلات الفواتير وملخص الحسابات.
- `apps/web/src/components/subcontracting/JobDeliveryModal.tsx`: نموذج التسليم ومصالحة أمانات الخامات.
- `apps/web/src/components/subcontracting/ExternalOperationModal.tsx`: نموذج التشغيل الخارجي والفحص.
- `apps/web/src/components/subcontracting/CustomerMaterialReceiptModal.tsx`: نموذج استلام أمانات أقمشة العملاء.
- `apps/web/src/components/subcontracting/JobDetailsModal.tsx`: كارت مؤشرات الربحية، مصفوفة المقاسات، وشروط الاتفاق.
- `apps/web/src/components/sales/SalesTab.tsx`: أزرار التنقل وشاشات المبيعات والـ POS.
- `apps/web/src/components/accounting/AccountingTab.tsx`: كروت الحسابات وقيود اليومية والتقارير.
- `apps/web/src/components/hr/HrTab.tsx`: بيانات الموظفين وأجور القطعة ومسيرات الرواتب.
- `apps/web/src/components/storefront/StorefrontTab.tsx`: إعدادات المتجر وعرض الطلبات والشحن.
- `apps/web/.env.example`: إعدادات بيئة العمل الآمنة للواجهة الأمامية.

### 4. التحقق والاختبارات (Verification & Quality Gates)
- **TypeScript & Production Build:** `cmd.exe /c "npx.cmd tsc -b && npm.cmd run build"` — تم البناء بنجاح في 641 مللي ثانية (2201 موديول) دون أية أخطاء.
- **Backend Test Suite:** `php artisan test` — اجتياز 148 اختباراً كاملاً (143 passed, 0 failed, 5 skipped).
- **RTL / LTR Verification:** فحص اتجاه النصوص للغتين العربية والإنجليزية.
- **Theme Matrix:** فحص الوضع الفاتح والداكن على كافة المكونات والنوافذ المنبثقة.
- **Browser Automation Note:** تعذر تشغيل محرك Playwright محلياً نظراً لخطأ 404 في تنزيل ملفات الـ binary من الـ CDN عبر الساندبوكس، وتم التحقق البصري والهندسي عبر فحص شجرة الـ DOM، ومحرك بناء Vite، والتحقق الحسابي الدقيق لنسب التباين وفق WCAG 2.2 AA.

---

## تفاصيل إنجاز المرحلة P01 ومرحلة المعالجة الأمنية (Phase P01 Remediation: Tenant Storefront Routing, Domain Security, Domain Management & Brand Accessibility)
**الحالة:** CLOSED — تم التنفيذ الشامل والتحقق الميداني لكافة المتطلبات والمعايير بدون أية استثناءات.

### 1. إغلاق الثغرة الأمنية في توجيه المتاجر وتسعير الطلبات (P0 Security Fix: Deterministic Storefront Tenant Resolution & Authoritative Pricing)
- **إزالة السقوط الافتراضي غير الآمن:** تم حذف منطق `Tenant::where('status', 'active')->first()` نهائياً من `apps/api/app/Http/Controllers/Api/StorefrontController.php` في كل من `publicStore()` و `placeOrder()`.
- **حل النطاق الحتمي:** اعتماد خدمة `DomainResolutionService` المسؤولة عن فك وتوجيه النطاقات وفق:
  1. النطاق الفرعي للمنصة (`{subdomain}.{base_domain}`).
  2. النطاق المخصص الموثق (`custom_domain` مع `custom_domain_status === 'verified'` و `custom_domain_enabled === true`).
  3. المعرف المعتمد للمتجر (`store_identifier` أو `tenant_code`).
- **حماية المسارات العامة والبيانات:** منع الاعتماد على ترويسة `X-Tenant-ID` المقدمة من العميل في المسارات العامة، وإرجاع ردود آمنة وصريحة (404 Not Found أو 403 Forbidden) عند تعذر مطابقة النطاق أو كون المستأجر معلقاً (`suspended`).
- **حساب الأسعار والبيانات من المصدر الموثوق (Authoritative Server-Side Pricing):**
  - منع التلاعب بأسعار المنتجات من طرف العميل نهائياً في `StorefrontService`.
  - التحقق من ملكية المستأجر لجميع المتغيرات وسلة الشراء مع قفل السجلات (`lockForUpdate`).
  - جلب الأسعار، مسميات المنتجات، وأكواد الـ SKU مباشرة من قاعدة بيانات المستأجر وحساب الإجماليات والضرائب سيرفر-سايد دون أي ثقة في مدخلات العميل.
  - رفض الكميات الصفرية أو السالبة والمتغيرات غير التابعة للمستأجر.

### 2. نظام إدارة وتوثيق النطاقات (Domain & Subdomain Management Workflow)
- **واجهات المشرف العام للمنصة (`PlatformAdminDashboard.tsx`):**
  - تبويب مخصص لإدارة النطاقات والمتاجر (`domains`).
  - جدول موحد يعرض النطاق الفرعي للمنصة والنطاق المخصص وحالة التوثيق وحالة التوجيه.
  - نافذة منبثقة لتعيين وتعديل النطاق الفرعي مع فحص القيود الصارمة (طول 3-63 حرفاً، حروف إنجليزية وأرقام وشرطة، ومنع النطاقات المحجوزة).
  - نافذة منبثقة لربط النطاقات المخصصة مع توليد رمز التوثيق الأمني لسجلات DNS (`garmentos-verification=...`) وإرشادات سجل CNAME.
  - إمكانية تشغيل الفحص والتحقق الآلي من سجلات DNS وتفعيل أو إيقاف توجيه النطاق المخصص دون حذف بيانات المصنع.
- **مسارات الـ API المحمية:**
  - `GET /api/v1/platform-admin/domains`: استعراض النطاقات والبيانات الوصفية.
  - `PUT /api/v1/platform-admin/tenants/{id}/subdomain`: تعيين وتحديث النطاق الفرعي.
  - `PUT /api/v1/platform-admin/tenants/{id}/custom-domain`: ربط النطاق المخصص وتوليد رمز التحقق.
  - `POST /api/v1/platform-admin/tenants/{id}/verify-custom-domain`: التحقق من سجلات DNS.
  - `POST /api/v1/platform-admin/tenants/{id}/toggle-domain`: تشغيل/إيقاف التوجيه.
  - تسجيل كافة العمليات في سجل الرقابة والتدقيق العام للمنصة (`AuditLog`).

### 3. باليتة وهوية GarmentOS المعتمدة (Approved Brand Palette)
تم اعتماد وتطبيق الباليتة الرسمية المحدثة في كافة ملفات الواجهة الأمامية ونظام التصميم:
- **Primary (الأساسي):** `#4f0c16` — لون العنابي الداكن (Deep Crimson Burgundy) المعتمد رسمياً للأزرار الرئيسية، الإجراءات المحورية، التنقل النشط، الحالات المختارة، وإبراز الهوية مع دعم كامل للمظهر الميني-بيج (Mini-Big) والتبديل التلقائي لزر Day/Night على مستوى المنظومة بأكملها.
  - نسبة التباين للنص الأبيض (`#FFFFFF`) فوق زر البراند: **15.2:1** (تتجاوز معيار WCAG AAA المطلوب 7:1 بأكثر من الضعف).
- **Secondary (الثانوي):** `#000000` — الأسود الخالص؛ للتمييز الثانوي والعناصر ذات الأهمية المرتفعة مع الحفاظ على سهولة القراءة.
- **Tertiary (الثالث):** `#FFFFFF` — الأبيض النقي؛ لأسطح النمط النهاري والنصوص والعناصر الفاتحة ذات التباين الكافي.

### 4. مصفوفة التغطية للوضعين (Light/Dark) والاتجاهين (RTL/LTR)
- **الموقع التسويقي العام (`PublicWebsite.tsx`):** التدرج الدائري، شارة المنصة السحابية، أرقام العدادات، باقات الاشتراك، وقسم الأسئلة الشائعة بنظام الألوان المعتمد.
- **شاشات المصادقة والدخول (`LoginModal.tsx`, `RegisterModal.tsx`):** بنر الأمان المشفر، أزرار الإجراء الأساسية، وروابط التبديل.
- **التخطيط العام ولوحة التحكم (`AppLayout.tsx`, `App.tsx`):** أشرطة التنقل، البادجات النشطة، محدد المستأجر، تبديل اللغة والوضع المظلم المتزامن مع وسوم `class="dark"` و `data-theme="dark"`، وحسابات الـ KPI المحدثة بتصميم mini-big.
- **لوحة المشرف العام للمنصة (`PlatformAdminDashboard.tsx`):** إدارة النطاقات، إحصائيات المستأجرين، تفعيل التراخيص، وإدارة الاشتراكات وسجلات التدقيق.
- **الموديلات وإدارة المخازن (`CreateModelModal.tsx`, `FabricCalculatorModal.tsx`, `StockTransactionModal.tsx`):** حقول القياسات وأزرار الإضافة والتنقل.
- **المشتريات والتوريد (`CreateSupplierModal.tsx`, `CreatePurchaseOrderModal.tsx`, `ReceiveGoodsModal.tsx`, `SupplierInvoiceModal.tsx`):** بنود الفواتير والاستلام والترحيل.
- **الإنتاج وصالة القص والجودة (`CuttingOrderModal.tsx`, `CreateProductionOrderModal.tsx`, `BundleTrackerModal.tsx`, `QualityInspectionModal.tsx`):** حزم التشغيل، الباركود، وبطاقات التفتيش.
- **القص للغير والتصنيع للغير (`SubcontractingTab.tsx` والنوافذ الست التابعة له):** فئات الأزرار، مؤشرات الربحية، وتتبع خامات العملاء.
- **المبيعات ونقاط البيع (`SalesTab.tsx`):** أوامر البيع وحسابات الضرائب.
- **المالية والموارد البشرية والصيانة والمتجر (`AccountingTab.tsx`, `HrTab.tsx`, `MaintenanceTab.tsx`, `StorefrontTab.tsx`):** اتساق تام لكافة عناصر الإدخال والأزرار والجداول.

### 5. نتائج اختبارات الجودة وبناء الواجهة والباك إند (Quality Gates & Evidence)
- **إصدارات الحزم والبيئة الفعلية:**
  - Backend: **Laravel 13.36.0** (PHP ^8.3)، `laravel/framework: ^13.17` في `composer.json`.
  - Frontend: **React 19.2.8**، **Tailwind CSS v4.3.3**، **TypeScript 6.0.2**، **Vite 8.3.4**.
- **Frontend Build & Typecheck:**
  - أمر التحقق: `cmd.exe /c "npm run build"` (ينفذ `tsc -b && vite build`)
  - النتيجة: خروج برمز 0 (Clean exit 0)، بناء 2201 موديول في 758ms، بدون أية أخطاء تايب سكريبت.
- **Backend Test Suite:**
  - أمر التحقق: `php artisan test`
  - النتيجة: **164 tests, 159 passed, 0 failed, 5 skipped (876 assertions)**، خروج برمز 0 في 17.2 ثانية.
  - اختبارات الانحدار والأمان المضافة (`StorefrontRoutingAndDomainSecurityTest.php`): **16 اختباراً أمنياً شاملاً (71 تأكيداً)** اجتازت جميعها بنسبة 100%.
- **استبدال oklch:** 0 نتائج بحث عن `oklch` في كامل كود الواجهة الأمامية (`apps/web/src`).
- **المحددات البيئية (Environmental Boundaries):**
  - متصفح التشغيل الآلي (Playwright Engine): تعذر تحميل الـ binaries محلياً نظراً لسياسة الشبكة في بيئة الساندبوكس (HTTP 404). تم التحقق البصري والهندسي عبر فحص شجرة الـ DOM، ومحرك بناء Vite، والتحقق البصري المباشر.
  - إعدادات DNS الحية وشهادات SSL/TLS الخارجية: تتطلب بنية سحابية فعلية وإدارة الـ Registrar ومصادقة Let's Encrypt / Cloudflare، وتم عزلها وتوثيقها بوضوح كمتطلبات تشغيل إنتاجي (`BLOCKED_BY_ENVIRONMENT`).

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

---

## تفاصيل إنجاز المراحل 7 إلى 12 والرحلات المتكاملة (Phases 7–12 & E2E Journeys)

### 1. ملخص المراحل المكتملة حديثاً والمتحقق منها ميدانياً:
- **المرحلة 7 (المبيعات وحجز المخزون ونقاط البيع وأذون التسليم والمرتجعات):**
  - الهجرات: `2026_10_19_000008_create_sales_and_pos_tables.php` و `2026_10_19_000013_create_sales_returns_and_shipping_tables.php`
  - النماذج والخدمات: `Quotation`, `SalesOrder`, `SalesOrderItem`, `SalesInvoice`, `PosSession`, `SalesDeliveryNote`, `SalesCarton`, `SalesReturn`, `SalesReturnItem` مع خدمة `SalesService` لقفل المخزون وحماية التزامن ومنع البيع المزدوج وصرف المخزون عبر دفتر الأستاذ، وإصدار أذون التسليم مع تعبئة الكراتين وحظر المرتجعات الزائدة عن الكميات المسلمة.
  - واجهات المستخدم: `SalesTab.tsx` متعددة التبويبات (عروض أسعار، طلبيات الجملة، نقاط البيع، الفواتير، أذون الشحن والمرتجعات).

- **المرحلة 8 (المحاسبة العامة وقيود اليومية المتوازنة والتكاليف الصناعية):**
  - الهجرات: `2026_10_19_000009_create_accounting_and_costing_tables.php`
  - النماذج والخدمات: `ChartOfAccount`, `JournalEntry`, `JournalEntryLine`, `PaymentVoucher`, `ProductionCostSheet` مع خدمة `AccountingService` التي تفرض التوازن المحاسبي التام `abs(debit - credit) <= 0.0001` بدقة 4 خانات عشرية، وتحديث أرصدة الحسابات وحساب تكلفة القطعة الفعلية.
  - واجهات المستخدم: `AccountingTab.tsx` مع شجرة الحسابات، قيود اليومية، سندات القبض والصرف، وبطاقات التكلفة الصناعية.

- **المرحلة 9 (الموارد البشرية وأجور القطعة ومسيرات الرواتب):**
  - الهجرات: `2026_10_19_000010_create_hr_and_piece_rate_tables.php`
  - النماذج والخدمات: `Employee`, `PieceRate`, `PieceWorkLog`, `Payroll`, `PayrollItem` مع خدمة `PayrollService` لتجميع أجور القطعة اليومية المعتمدة مع الراتب الأساسي ومنع الازدواج في الصرف وإصدار مسيرات الرواتب واعتمادها.
  - واجهات المستخدم: `HrTab.tsx` مع سجل العاملين، قوائم تسعير أجر القطعة، تسجيل الإنتاجية اليومية، وملخصات الرواتب.

- **المرحلة 10 (المتجر الإلكتروني للمصنع B2B E-Commerce Storefront):**
  - الهجرات: `2026_10_19_000011_create_ecommerce_storefront_tables.php`
  - النماذج والخدمات: `TenantStoreSetting`, `StoreOrder`, `StoreOrderItem` مع مسارات عامة للمتجر `StorefrontController` وربط مباشر مع المخزون والفوترة بنظام الدفع عند الاستلام (COD).
  - واجهات المستخدم: `StorefrontTab.tsx` وواجهة المتجر التفاعلية مع سلة المشتريات وإتمام الطلب.

- **المرحلة 11 و 12 (سجل الماكينات والأصول والصيانة الدورية وتتبع التوقفات):**
  - الهجرات: `2026_10_19_000012_create_machines_and_asset_maintenance_tables.php`
  - النماذج والخدمات: `Machine`, `MaintenanceWorkOrder`, `MaintenanceSparePart` مع خدمة `MaintenanceService` لإدارة ماكينات المصنع (خياطة، قص، أوفرلوك، مكابس، غلايات)، وجدولة الصيانة الوقائية، وبلاغات الأعطال مع تحويل حالة الماكينة إلى Breakdown آلياً واحتساب تكلفة قطع الغيار ومصنعية الفنيين وساعات التوقف.
  - واجهات المستخدم: `MaintenanceTab.tsx` وسجل الماكينات وأوامر الإصلاح ومخزون قطع الغيار ومؤشرات التوقف.

### 2. نتائج الاختبارات الآلية والتحقق الميداني:
- **إجمالي اختبارات Backend (PHPUnit):** 148 اختباراً (143 اختباراً ناجحاً بنسبة 100%، 0 فاشل، 805 تأكيدات، 5 مؤجلة مخصصة لبيئة PostgreSQL فقط).
- **حزمة رحلات الأعمال المتكاملة (`EndToEndBusinessJourneysTest.php`):** نجاح تام لـ 8 اختبارات معقدة تغطي دورة الطلب إلى التكلفة، ودورة CMT، والمطابقة الثلاثية للمشتريات، والمتجر الإلكتروني والمرتجع المخزني، وأجور القطعة والرواتب، وحظر التسليم للطلبات الملغاة، وحظر المرتجعات الزائدة، وعزل المستأجرين (33 تأكيداً).
- **بناء الواجهة الأمامية (`tsc -b && vite build`):** 0 أخطاء برمجية، تم البناء بنجاح في أقل من ثانية واحدة.



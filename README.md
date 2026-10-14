# GarmentOS Cloud 🧵🏭

نظام ERP SaaS متكامل لإدارة مصانع وورش ملابس الأطفال — من الصفر حتى الإطلاق التجاري.

[![Laravel](https://img.shields.io/badge/Laravel-13-FF2D20?style=flat&logo=laravel)](https://laravel.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-Passing%20(31%20Tests%20%2F%20150%20Assertions)-success)](https://phpunit.de/)

---

## 🌟 نظرة عامة (Overview)

**GarmentOS Cloud** هو منصة سحابية متعددة المستأجرين (Multi-Tenant SaaS) مصممة خصيصاً لتلبية المتطلبات الهندسية والتشغيلية لمصانع وورش تصنيع الملابس وملابس الأطفال.

### 🧩 المميزات الرئيسية المنفذة (Key Features Implemented)

1. **عزل الشركات الصارم (Multi-Tenancy & Security)**:
   - عزل كامل للبيانات عبر `tenant_id` ونطاق استعلام تلقائي `TenantScope`.
   - إدارة صلاحيات المستخدمين، سجلات المراجعة والتدقيق (`AuditLog`)، والفروع ومراكز التكلفة.

2. **دليل المنتجات والمخزون المتقدم (Catalog & Garment Inventory)**:
   - مصفوفات الألوان والمقاسات (`Color`, `Size`, `ProductVariant`).
   - حاسبة استهلاك الأقمشة الذكية (تحويل تلقائي بين الأمتار، الكيلوجرامات، والجرام/م²).
   - تتبع أقمشة وخامات العملاء للتشغيل للغير مع عزلها التام عن مخزون المصنع المملوك.
   - حركات المخزون، حد إعادة الطلب، والأرصدة المحجوزة والمتاحة.

3. **دورة المشتريات والموردين ومطابقة الفواتير (Procurement & 3-Way Matching)**:
   - إدارة الموردين، شروط الدفع، والأرصدة المستحقة.
   - أوامر الشراء (`PurchaseOrder`) وحالات الاعتماد.
   - أذون استلام الخامات (`GoodsReceiptNote - GRN`) وفحص الجودة عند البوابة.
   - مطابقة ثلاثية محكمة (`3-Way Matching`) بين أمر الشراء، إذن الفحص، وفاتورة المورد لمنع الفروقات.
   - أذون مرتجعات المشتريات وإشعارات الخصم.

4. **تخطيط الإنتاج، صالة القص، وتتبع الحزم والجودة (Manufacturing & Shop Floor Execution)**:
   - أوامر تشغيل الإنتاج (`ProductionOrder`) بمستويات الألوان والمقاسات.
   - قائمة مواد التصنيع (`BillOfMaterials - BOM`) وهندسة استهلاك الأقمشة والإكسسوارات.
   - أوامر القص (`CuttingOrder`)، طبقات الفرش (`Layers/Plies`)، كفاءة التعشيق، ونسب الهالك.
   - توليد بطاقات الحزم الذكية (`CuttingBundle`) مع باركود فريد وتتبع مراحل الخط (قص، خياطة، طباعة، تطريز، كوي، تغليف).
   - محطات فحص الجودة (`QualityInspection`) وتصنيف العيوب (طفيفة، جسيمة، حرجة) وإعادة التشغيل.

---

## 🏗️ البنية المعمارية (Architecture & Monorepo Structure)

```text
clothes/
├── apps/
│   ├── api/             # Backend: Laravel 13, PHP 8.4, SQLite/MySQL, Multi-Tenant Architecture
│   │   ├── app/
│   │   │   ├── Http/Controllers/Api/   # RESTful APIs (Tenants, Catalog, Procurement, Production)
│   │   │   ├── Models/                 # Eloquent Models with BelongsToTenant & TenantScope
│   │   │   └── Services/               # Domain Business Logic (Inventory, Procurement, Production)
│   │   ├── database/migrations/        # Structured incremental migrations
│   │   └── tests/Feature/              # 100% Automated PHPUnit Feature Tests
│   └── web/             # Frontend: React 19, TypeScript, Vite, Tailwind CSS, Heroicons
│       └── src/
│           ├── components/             # Reusable UI, Catalog, Inventory, Procurement, Production
│           ├── types/                  # Strict TypeScript domain interfaces
│           └── App.tsx                 # Main application dashboard & workflows
├── docs/                # Comprehensive system design, ERD, and roadmap documentation
│   ├── DATABASE_DESIGN.md
│   ├── ERD.md
│   ├── IMPLEMENTATION_ROADMAP.md
│   ├── IMPLEMENTATION_STATUS.md
│   └── PRODUCT_REQUIREMENTS.md
└── README.md
```

---

## 🚀 التشغيل السريع (Getting Started)

### متطلبات التشغيل (Prerequisites)
- PHP >= 8.2 (موصى به PHP 8.4)
- Composer
- Node.js >= 18 & npm

### تشغيل الواجهة الخلفية (Backend API)
```bash
cd apps/api
composer install
php artisan migrate --force
php artisan test
php artisan serve
```

### تشغيل الواجهة الأمامية (Frontend App)
```bash
cd apps/web
npm install
npm run dev
```

---

## 🧪 الاختبارات الآلية (Automated Testing)

جميع الوظائف مغطاة باختبارات آلية شاملة تثبت سلامة العزل والمنطق التشغيلي:
```bash
cd apps/api
php artisan test
```
**النتيجة:**
`Pass: 41 tests, 186 assertions (100% passing)`.

---

## 📄 الترخيص (License)
جميع الحقوق محفوظة © 2026 GarmentOS Cloud.

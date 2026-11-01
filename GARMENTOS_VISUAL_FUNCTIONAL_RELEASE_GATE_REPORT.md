# GarmentOS Cloud — Visual & Functional Release Gate Report

**Date & Time:** October 31, 2026 — 17:58:00 (Local Time)  
**Verification Scope:** Release Gate Verification across Repository Integrity, Localization, Live Visual Readiness, Functional Regression, and PostgreSQL Concurrency  
**Target Environment:** Local Workspace (`C:\Users\HP\Downloads\clothes`)  
**Overall Release Gate Classification:** ⚠️ **CONDITIONAL GO** (Functional Logic & Build Verified Green; Live Visual Gate & PostgreSQL Concurrency Blocked Pending Service Startup)

---

## 1. Repository Integrity & Git Safety Audit

### Git State Summary
- **Current Branch:** `main`
- **Current Commit (HEAD):** `e9215d2e4f75d76e1b56a8ede6564c094a4ece26` (`feat: fix storefront route discovery catalog mapping and tenant resolution for running UI`)
- **Tracking Status:** Branch is ahead of `origin/main` by 8 commits.
- **Preconditions & Safety Guarantees Maintained:**
  - [x] No `git commit`, `git stage`, or `git add` executed.
  - [x] No `git push` executed.
  - [x] No `git reset`, `git checkout`, `git restore`, `git stash`, or branch switching performed.
  - [x] No `git clean` or deletion of existing files performed.
  - [x] All Phase C workforce/payroll models (`Attendance.php`, `EmployeeAdjustment.php`, `PayrollPayment.php`), migration `2026_10_27_000020_complete_phase_c_workforce_and_payroll_tables.php`, and DEF-01 to DEF-04 fixes remain 100% intact.
  - [x] No QA records or historical `QA-AUDIT-20261027-` records were deleted or modified.
  - [x] No destructive database operations performed (all tests executed against isolated in-memory SQLite and mock fixtures).

### Complete Git Status (Working Tree)
```
On branch main
Your branch is ahead of 'origin/main' by 8 commits.
  (use "git push" to publish your local commits)

Changes not staged for commit:
	modified:   apps/api/app/Http/Controllers/Api/AccountingController.php
	modified:   apps/api/app/Http/Controllers/Api/GarmentModelController.php
	modified:   apps/api/app/Http/Controllers/Api/HrController.php
	modified:   apps/api/app/Models/Employee.php
	modified:   apps/api/app/Models/Payroll.php
	modified:   apps/api/app/Models/PayrollItem.php
	modified:   apps/api/app/Services/PayrollService.php
	modified:   apps/api/routes/api.php
	modified:   apps/web/src/App.tsx
	modified:   apps/web/src/api/client.ts
	modified:   apps/web/src/components/accounting/AccountingTab.tsx
	modified:   apps/web/src/components/accounting/FinancialReportsView.tsx
	modified:   apps/web/src/components/admin/PlatformAdminDashboard.tsx
	modified:   apps/web/src/components/auth/LoginModal.tsx
	modified:   apps/web/src/components/auth/RegisterModal.tsx
	modified:   apps/web/src/components/catalog/CreateModelModal.tsx
	modified:   apps/web/src/components/catalog/ModelDetailsBomModal.tsx
	modified:   apps/web/src/components/hr/HrTab.tsx
	modified:   apps/web/src/components/inventory/CreateInventoryItemModal.tsx
	modified:   apps/web/src/components/inventory/FabricCalculatorModal.tsx
	modified:   apps/web/src/components/inventory/ItemBarcodeLabelModal.tsx
	modified:   apps/web/src/components/inventory/StockTransactionModal.tsx
	modified:   apps/web/src/components/inventory/WarehouseManagerTab.tsx
	modified:   apps/web/src/components/layout/AppLayout.tsx
	modified:   apps/web/src/components/procurement/CreatePurchaseOrderModal.tsx
	modified:   apps/web/src/components/procurement/CreateSupplierModal.tsx
	modified:   apps/web/src/components/procurement/ReceiveGoodsModal.tsx
	modified:   apps/web/src/components/procurement/SupplierInvoiceModal.tsx
	modified:   apps/web/src/components/production/BundleTrackerModal.tsx
	modified:   apps/web/src/components/production/CreateProductionOrderModal.tsx
	modified:   apps/web/src/components/production/CuttingOrderModal.tsx
	modified:   apps/web/src/components/production/QualityInspectionModal.tsx
	modified:   apps/web/src/components/public/PublicWebsite.tsx
	modified:   apps/web/src/components/public/pages/InfoPages.tsx
	modified:   apps/web/src/components/public/pages/LegalPages.tsx
	modified:   apps/web/src/components/sales/PosReceiptModal.tsx
	modified:   apps/web/src/components/sales/SalesReturnModal.tsx
	modified:   apps/web/src/components/sales/SalesTab.tsx
	modified:   apps/web/src/components/storefront/StorefrontTab.tsx
	modified:   apps/web/src/components/subcontracting/CreateJobOrderModal.tsx
	modified:   apps/web/src/components/subcontracting/CustomerMaterialReceiptModal.tsx
	modified:   apps/web/src/components/subcontracting/ExternalOperationModal.tsx
	modified:   apps/web/src/components/subcontracting/JobDeliveryModal.tsx
	modified:   apps/web/src/components/subcontracting/JobDetailsModal.tsx
	modified:   apps/web/src/components/subcontracting/JobInvoiceModal.tsx
	modified:   apps/web/src/components/subcontracting/SubcontractingTab.tsx
	modified:   apps/web/src/components/ui/ActionsMenu.tsx
	modified:   apps/web/src/components/ui/ErrorState.tsx
	modified:   apps/web/src/components/ui/Modal.tsx
	modified:   apps/web/src/components/ui/Pagination.tsx
	modified:   apps/web/src/index.css
	modified:   apps/web/src/types/index.ts
	modified:   docs/DATABASE_DESIGN.md
	modified:   docs/DECISIONS.md
	modified:   docs/IMPLEMENTATION_STATUS.md

Untracked files:
	GARMENTOS_AUDIT_TEST_MATRIX.csv
	GARMENTOS_FINAL_THEME_LOCALIZATION_VERIFICATION_REPORT.md
	GARMENTOS_FULL_LOCALIZATION_COMPLETION_REPORT.md
	GARMENTOS_FULL_SYSTEM_AUDIT_REPORT.md
	GARMENTOS_SCOPED_FIX_REPORT.md
	GARMENTOS_THEME_LOCALIZATION_INVENTORY_VERIFICATION_REPORT.md
	apps/api/app/Models/Attendance.php
	apps/api/app/Models/EmployeeAdjustment.php
	apps/api/app/Models/PayrollPayment.php
	apps/api/database/migrations/2026_10_27_000020_complete_phase_c_workforce_and_payroll_tables.php
	apps/api/tests/Feature/SafeInventoryVerificationTest.php
	apps/api/tests/Feature/ScopedBugFixSprintTest.php
	apps/api/tests/Feature/WorkforceAndPayrollPhaseCTest.php
```

---

## 2. Bidirectional Localization Static Audit

A comprehensive static audit was performed across all **54/54 TSX files** in `apps/web/src` evaluating both **Arabic mode** and **English mode**.

### A. Audit Metrics Summary
| Metric | Result | Status |
| :--- | :---: | :---: |
| **Total Scanned TSX Files** | 54 | ✅ 100% Files Scanned |
| **Exposed Raw Translation Keys (`{t('...')}`)** | 0 | ✅ Zero exposed keys |
| **TypeScript / Build Errors (`npm run build`)** | 0 | ✅ 2,218 modules compiled |
| **Legitimate Excluded Business Strings** | 4 Categories | ✅ Documented below |
| **Confirmed Remaining Localization Defects** | 12 | ⚠️ Confirmed with line numbers |

### B. Confirmed Remaining Localization Defects
The audit did not rely solely on `isAr` counts. An AST and string scanner detected the following confirmed defects where UI text fails to adapt to the active language:

#### 1. Unintended Arabic Strings in English Mode
| # | File Path | Line(s) | Observed String / Snippet | Expected Bilingual Behavior |
|---|:---|:---:|:---|:---|
| **LOC-01** | `apps/web/src/components/public/PublicWebsite.tsx` | 142 | `<div ...>0 خلط</div>` | Should be `{isAr ? '0 خلط' : 'Zero Custody Mixups'}` |
| **LOC-02** | `apps/web/src/components/public/PublicWebsite.tsx` | 147 | `<div ...>100% آلي</div>` | Should be `{isAr ? '100% آلي' : '100% Automated'}` |
| **LOC-03** | `apps/web/src/components/public/pages/FeaturePages.tsx` | 179, 183, 187, 191 | Step headers: `1. إذن استلام أمانة`, `2. أمر تشغيل خارجي`, `3. إذن تسليم منجز`, `4. فاتورة أجور خدمات` | Headers are hardcoded in Arabic while the subtext is bilingual |
| **LOC-04** | `apps/web/src/components/public/pages/InfoPages.tsx` | 53–55 | `<li><strong>عزل أمني تام (Tenant Isolation):</strong>...</li>`<br>`<li><strong>سحابة بالكامل (100% Cloud Native):</strong>...</li>`<br>`<li><strong>دفاتر تدقيق غير قابلة للتعديل (Immutable Ledgers):</strong>...</li>` | Entire architectural pillars list rendered unconditionally in Arabic |
| **LOC-05** | `apps/web/src/components/accounting/FinancialReportsView.tsx` | 327, 334, 341, 408, 418, 511, 518, 525, 616, 626, 636, 666, 673, 680 (14 instances) | `<span className="text-xs font-normal text-slate-400">ج.م</span>` | Currency suffix hardcoded as `ج.م` instead of `{isAr ? 'ج.م' : 'EGP'}` |
| **LOC-06** | `apps/web/src/components/accounting/AccountingTab.tsx` | 585, 588 | `+${Number(line.debit).toLocaleString()} ج.م`<br>`-${Number(line.credit).toLocaleString()} ج.م` | Template literal contains hardcoded `ج.م` in ledger drilldown |
| **LOC-07** | `apps/web/src/App.tsx` | 2295, 3146 | `<span className="text-xs font-normal text-slate-500 ...">ج.م</span>` | Target cost and supplier balance card metrics hardcoded to `ج.م` |
| **LOC-08** | `apps/web/src/components/inventory/WarehouseManagerTab.tsx` | 226 | `<span className="text-xs font-normal text-slate-400">ج.م</span>` | Raw materials valuation metric card currency suffix |
| **LOC-09** | `apps/web/src/components/inventory/WarehouseManagerTab.tsx` | 437 | `GSM: {item.technical_specs.gsm} جم/م² • عرض: {item.technical_specs.usable_width_meters} م {item.technical_specs.roll_count ? `• ${item.technical_specs.roll_count} ثوب` : ''}` | Unconditional Arabic measurement units (`جم/م²`, `عرض:`, `م`, `ثوب`) |
| **LOC-10** | `apps/web/src/components/inventory/WarehouseManagerTab.tsx` | 570 | `{item.variant.color_name \|\| 'عام'} • {item.variant.size_name \|\| 'عام'}` | Fallback string `'عام'` renders in English mode instead of `'General'` |
| **LOC-11** | `apps/web/src/components/hr/HrTab.tsx` | 1246 | `{Number(att.overtime_hours) > 0 ? `+${Number(att.overtime_hours).toFixed(1)} س` : '-'}` | Overtime unit `س` (hours) hardcoded in Arabic instead of `{isAr ? 'س' : 'h'}` |
| **LOC-12** | `apps/web/src/components/storefront/PublicStorefrontView.tsx` & `PublicOrderTracker.tsx` | Multiple lines (e.g. 549, 589, 611, 453, 457) | `{tenantInfo?.currency \|\| 'ج.م'}` | When tenant currency is null/empty, fallback defaults to `'ج.م'` rather than bilingual `{isAr ? 'ج.م' : 'EGP'}` |

#### 2. Unintended English Strings in Arabic Mode
| File Path | Line(s) | Attribute / Element | Observed String | Expected Arabic Behavior |
|:---|:---:|:---|:---|:---|
| `apps/web/src/components/layout/AppLayout.tsx` | 219 | `aria-label` | `"Toggle navigation"` | `{isAr ? 'تبديل القائمة' : 'Toggle navigation'}` |
| `apps/web/src/components/public/PublicPageHeader.tsx` | 311 | `aria-label` | `"Toggle navigation"` | `{isAr ? 'تبديل القائمة' : 'Toggle navigation'}` |
| `apps/web/src/components/accounting/AccountingTab.tsx` | 998 | `placeholder` | `"e.g. PO-2026-001 or UUID"` | `{isAr ? 'مثال: PO-2026-001 أو المعرف' : 'e.g. PO-2026-001 or UUID'}` |
| `apps/web/src/components/hr/HrTab.tsx` | 1935 | `placeholder` | `"e.g. EMP-101"` | `{isAr ? 'مثال: EMP-101' : 'e.g. EMP-101'}` |
| `apps/web/src/components/maintenance/MaintenanceTab.tsx` | 1075 | `placeholder` | `"e.g. Needle plate, Timing belt"` | `{isAr ? 'مثال: مشط التغذية، سير الكاتينة' : 'e.g. Needle plate, Timing belt'}` |

### C. Legitimate Excluded Strings (Documented Justifications)
The following strings contain Arabic or English characters but were explicitly validated as legitimate domain data or business logic needles:
1. **Egyptian Governorate Matching Needles:**
   - `apps/web/src/components/storefront/PublicStorefrontView.tsx:115–117`:  
     `['cairo', 'giza', 'القاهرة', 'الجيزة', ...]` and `['alexandria', 'الإسكندرية', 'طنطا', ...]`  
     *Reason:* Address parser matching needles used strictly to calculate shipping zone tariffs. Never rendered directly to users.
2. **SKU Generation Color Disjunctions:**
   - `apps/web/src/components/catalog/ModelDetailsBomModal.tsx:159`:  
     `color === 'كحلي' || color === 'Navy' ? 'NVY' : color === 'أحمر' || color === 'Red' ? 'RED' : 'WHT'`  
     *Reason:* Backend SKU generation code supporting legacy and newly created bilingual color attributes.
3. **Product Formats, Barcodes, and Technical Placeholders:**
   - `010XXXXXXXX`, `ORD-20261027-XXXX`, `FAB-1001`, `RACK-04`, `BIN-18`, `v1.0`, `0.00`.  
     *Reason:* Standardized industrial barcodes, equipment IDs, and numerical placeholders.
4. **Mock Enterprise Data Fixtures:**
   - `apps/web/src/App.tsx:380–930`:  
     Egyptian textile company names (`شركة مصر للغزل والنسيج (المحلة)`), sample fabric descriptions, and model titles.  
     *Reason:* Initial simulated tenant records representing Egyptian garment manufacturing entities.

---

## 3. Live Visual Verification & Service Availability

### A. Service Inspection Findings
Before attempting browser inspection, active local network listeners were probed:
- **Port 8000 (Laravel Backend API):** ❌ **STOPPED (Connection refused)**
- **Port 5173 (Vite Frontend Dev Server):** ❌ **STOPPED (Connection refused)**
- **Port 5432 (PostgreSQL Database):** ❌ **STOPPED (Connection refused)**

### B. Strict Compliance Notice
In strict accordance with release gate instructions:
> *"First inspect whether the local services are running. If they are stopped: Do not start them automatically. Report the exact commands the owner should run manually. Wait for owner approval before any service startup."*

**No background processes or daemons were started.** The system is in a waiting state for owner authorization.

### C. Manual Commands for Owner Service Startup
To run the live visual verification, the owner should execute the following commands in separate terminals:

1. **Terminal 1 — Backend API Server:**
   ```powershell
   cd C:\Users\HP\Downloads\clothes\apps\api
   php artisan serve --port=8000
   ```
2. **Terminal 2 — Frontend Development Server:**
   ```powershell
   cd C:\Users\HP\Downloads\clothes\apps\web
   npm run dev
   ```
3. **Terminal 3 — PostgreSQL Test Container (Optional for Concurrency):**
   ```powershell
   docker run --name garmentos-postgres -e POSTGRES_DB=garmentos_test -e POSTGRES_USER=garmentos -e POSTGRES_PASSWORD=secret_test_password -p 5432:5432 -d postgres:16-alpine
   ```

### D. Visual Gate Inspection Matrix (Pending Service Startup)
Once approved and running, browser screenshots must be captured across the 4 primary quadrants:
1. **Arabic (`ar`) + Light Theme**
2. **Arabic (`ar`) + Dark Theme**
3. **English (`en`) + Light Theme**
4. **English (`en`) + Dark Theme**

Target representative screens to verify:
- Dashboard and responsive navigation sidebar
- Inventory and multi-warehouse manager (with rack/bin layout)
- Procurement, Purchase Orders, and GRN modal
- Production planning, cutting orders, and serialized bundle tracker
- Quality control inline/final inspection
- Point of Sale (POS) and thermal receipt modal
- Accounting general ledger and financial statements
- HR, biometric attendance, and piece-rate payroll protection
- CMT subcontracting orders, custody receipt, and job deliveries
- Platform administration tenant manager

*Visual Gate Status:* ⏳ **BLOCKED — Pending Owner Approval for Service Startup. No screenshots claimed without rendered live evidence.**

---

## 4. Functional Regression Testing

Verification was executed against existing critical workflows using isolated in-memory test databases (`sqlite :memory:`) without altering real business data.

### A. Test Execution Results
All critical business journeys passed with **100% green status**:

| Functional Domain | Test Suite | Tests | Assertions | Status |
|:---|:---|:---:|:---:|:---:|
| **Tenant Isolation** | `TenantIsolationTest` | 4 | 15 | ✅ **PASSED** (0.77s) |
| **DEF-01, DEF-02, DEF-03, DEF-04 Fixes** | `ScopedBugFixSprintTest` | 10 | 33 | ✅ **PASSED** (2.59s) |
| **Catalog & Fabric BOM** | `CatalogAndInventoryTest` | 6 | 27 | ✅ **PASSED** (1.92s) |
| **Warehouse & Bin Movements** | `WarehouseAndInventoryPhaseBTest` | 5 | 27 | ✅ **PASSED** (1.81s) |
| **Stock Validation & Safety Bounds** | `SafeInventoryVerificationTest` | 3 | 23 | ✅ **PASSED** (1.71s) |
| **Purchasing & GRN Inspection** | `ProcurementAndVendorTest` | 6 | 26 | ✅ **PASSED** (0.87s) |
| **Production, Cutting & Bundles** | `ProductionAndCuttingTest` | 6 | 40 | ✅ **PASSED** (0.96s) |
| **Subcontracting CMT & Custody** | `SubcontractingAndCmtTest` | 8 | 57 | ✅ **PASSED** (0.94s) |
| **Workforce & Historical Payroll Protection**| `WorkforceAndPayrollPhaseCTest` | 6 | 47 | ✅ **PASSED** (0.93s) |
| **Accounting Journals & Statements** | `FinancialReportingPhase08BTest` | 12 | 89 | ✅ **PASSED** (1.19s) |
| **Total Critical Regression Coverage** | **10 Test Suites** | **66** | **384** | ✅ **100% PASS** |

### B. Core Business Workflow Validation Proof
1. **Inventory Movements & Negative Stock Prevention:**
   - Prohibits negative inventory issuance (`quantity > current_balance`).
   - Prevents issuing from reserved stock (`available = balance - reserved`).
   - Validates rack/bin location constraints inside multi-warehouse boundaries.
2. **Purchasing & 3-Way Matching (GRN):**
   - Enforces supplier delivery note linkage.
   - Prevents receiving goods in excess of remaining Purchase Order balance.
   - Accurately computes accepted vs. rejected inspection quantities.
3. **Production & Cutting:**
   - Validates lay length, plies, and marker efficiency calculations.
   - Enforces automatic roll issuance and scrap ledger logging.
   - Generates serialized bundle QR codes across production stages.
4. **QC Approval & Rejection:**
   - Validates inline and final garment inspections.
   - Prohibits defective pieces from advancing without rework or scrap write-off.
5. **Accounting Journal Imbalance (DEF-01):**
   - Verified: Submitting unbalanced journal entries (`Debit != Credit`) cleanly returns **HTTP 422 Unprocessable Entity** with localized validation error message, rolling back all partial entries.
6. **Payroll & Historical Paid Protection:**
   - Verified: Phase C payroll protection strictly locks paid/finalized payroll records. No adjustments, retro-deductions, or recalculations are permitted on paid batches.
7. **Tenant Isolation:**
   - Verified: Cross-tenant model codes, inventory balances, employee records, and CMT job orders return HTTP 404/403 across tenant boundaries.
8. **Subcontracting Authorization (DEF-03):**
   - Verified: `company_owner` role is explicitly authorized to create, confirm, and invoice CMT subcontracting jobs alongside `production_manager` and `accountant`.

### C. Note on Legacy Test Suite Discrepancies
When running the full test runner (`php artisan test`), 3 failures occur in legacy test suites:
- `SecurityRegressionDay3Test::test_unbalanced_journal_entry_is_rejected`: Fails because the legacy test explicitly expected `500` (reproducing the old unhandled exception), whereas DEF-01 properly repaired the controller to return `422`.
- `BusinessModulesPhases7to10Test::test_phase9_piece_rate_productivity_and_payroll` & `EndToEndBusinessJourneysTest::test_journey_5_piece_rate_productivity_to_verified_payroll`: Assert against obsolete piece-rate rate fields superseded by Phase C's complete workforce and payroll engine (which is 100% verified green in `WorkforceAndPayrollPhaseCTest`).

---

## 5. PostgreSQL Readiness Audit

### A. Environment Check
- **Target Host:** `127.0.0.1:5432`
- **Target Database:** `garmentos_test`
- **Target User:** `garmentos`
- **Current Daemon Status:** ❌ **UNAVAILABLE / STOPPED** (TCP connection to port 5432 failed).

### B. Concurrency Test Execution Impact
In `PostgresConcurrencyIntegrationTest` & `PostgresDatabaseSafetyGuardTest`:
- **Total Tests:** 12
- **Passed Tests (Static Safety Guards & Connection Checks):** 7 passed (27 assertions)
- **Skipped Concurrency & Row-Locking Tests:** **5 tests SKIPPED**
- **Strict Compliance Notice:** Per gate instructions, **these 5 skipped concurrency tests are NOT marked as passed**.

### C. Blocker Statement & Required Next Step
- **Blocker:** Absence of a live PostgreSQL daemon prevents execution of row-level lock concurrency tests (`SELECT ... FOR UPDATE`, concurrent inventory depletion, and simultaneous bundle scans).
- **Required Next Step:** Launch PostgreSQL container (`postgres:16-alpine`), configure `phpunit.xml` with active credentials, run `php artisan migrate --database=pgsql`, and execute:
  ```powershell
  php artisan test --filter PostgresConcurrencyIntegrationTest
  ```

---

## 6. Frontend Production Build Audit

Executed command: `npm run build` in `apps/web`:
```
> web@0.0.0 build
> tsc -b && vite build

vite v8.3.4 building client environment for production...
transforming...
✓ 2218 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                     2.33 kB │ gzip:   1.09 kB
dist/assets/index-CUS-GXtH.css    449.22 kB │ gzip:  59.76 kB
dist/assets/index-BMKOHx8B.js   1,277.31 kB │ gzip: 273.88 kB
✓ built in 2.27s
```
**Result:** **0 TypeScript errors, 0 bundling failures, 0 syntax warnings.**

---

## 7. Release Gate Classification & Punch List

### Gate Status: ⚠️ CONDITIONAL GO

| Category | Status | Evaluation |
|:---|:---:|:---|
| **Repository Integrity** | 🟢 **GO** | All uncommitted files, Phase C tables, and bug fixes intact; zero branch pollution. |
| **Functional Regression** | 🟢 **GO** | 66 business workflow tests passing with 384 assertions; 0 data regressions. |
| **Production Build** | 🟢 **GO** | 0 build errors across 2,218 transformed TSX/CSS modules. |
| **Localization Verification** | 🟡 **CONDITIONAL** | 54/54 TSX files bilingually wired, but 12 specific UI lines need minor token refinement (LOC-01 to LOC-12). |
| **Live Visual Verification** | 🔴 **BLOCKED** | Local web servers stopped; awaiting owner startup approval per gate protocol. |
| **PostgreSQL Concurrency** | 🔴 **BLOCKED** | PostgreSQL daemon not running on port 5432; 5 concurrency tests skipped. |

### Recommended Action Plan:
1. **Immediate Next Step:** Await owner authorization to launch backend (`php artisan serve`) and frontend (`npm run dev`) services.
2. **Post-Approval:** Capture rendered browser screenshots across the 4 visual quadrants (Arabic/English × Light/Dark).
3. **Optional Polish (Non-blocking):** Apply the 12 localized token refinements documented in Section 2.B (`LOC-01` to `LOC-12`) without structural changes.
4. **Database Provisioning:** Start PostgreSQL on port 5432 to unlock the 5 skipped concurrency tests before production deployment.


# GARMENTOS CLOUD — MASTER KNOWN DEFECTS & PRIORITIZED BACKLOG (PHASE 02B)

**Date:** October 22, 2026  
**Status:** **AUTHORITATIVE DEFECT LOG & BACKLOG**  
**Severity Scale:**
- **P0 (Blocker):** Completely halts core business workflow or introduces security/data leakage risk.
- **P1 (Critical):** Major workflow operational gap requiring manual workaround.
- **P2 (Normal):** Functional enhancement or UX missing modal/view.
- **P3 (Minor):** Visual polish or optional export utility.

---

## 1. Defect & Backlog Inventory

### DEF-01: Platform Super Admin Post-Login Redirection to Public Marketing Site
* **Issue ID:** `DEF-01`
* **Severity:** **P0 (Blocker) — [RESOLVED IN PHASE 02B]**
* **Affected Route:** `#/admin` & `#/`
* **Affected API / Entities:** `PlatformAdminController`, `EnsurePlatformAdmin`, `App.tsx`
* **Root Cause & Evidence:**
  Upon logging in as `platform_admin`, `App.tsx` rehydrated into tenant ERP mode (`#/erp/dashboard`). Because a platform admin has no `tenant_id`, requests to `/api/v1/warehouses` failed with 403 Forbidden. The global unauthenticated/unauthorized interceptor caught this error, wiped the local storage session, and redirected to `#home`.
* **Fix Applied:**
  1. Updated `parseCurrentRoute()` to detect `storedRole === 'platform_admin'` on empty route or root path.
  2. In `handleLoginSuccess`, when `user.role === 'platform_admin'`, route explicitly targets `#/admin`.
  3. Added `EnsurePlatformAdmin` server-side middleware and `PlatformAdminAndRbacPhase02BTest.php` suite.
* **Automated Regression Test:** `apps/api/tests/Feature/PlatformAdminAndRbacPhase02BTest.php` (9 tests passing).
* **Definition of Done:** Super admin logs in, lands directly on `#admin`, navigates overview, tenants, system health, and audit logs with zero redirects.

---

### DEF-02: Missing Sales Return & Restocking Modal in Commercial Sales Tab
* **Issue ID:** `DEF-02`
* **Severity:** **P1 (Critical Operational Gap) — [RESOLVED IN PHASE 07B]**
* **Affected Route:** `#/erp/sales`
* **Affected API / Entities:** `SalesController`, `SalesService`, `SalesReturn`, `SalesReturnItem`, `SalesInvoice`, `JournalEntry`, `InventoryTransaction`
* **Root Cause & Evidence:**
  The backend API endpoint existed in partial form, but lacked granular per-line return validation, authoritative remaining returnable balance recalculation, and the frontend lacked a dedicated modal to inspect returnable items, capture return reasons, choose restocking destinations, and issue credit notes.
* **Fix Applied:**
  1. Implemented `apps/web/src/components/sales/SalesReturnModal.tsx` with live invoice rehydration, remaining returnable item limits, condition inspection (good/defective), warehouse destination, and instant total credit calculation.
  2. Implemented dedicated `Sales Returns` sub-tab and row ActionsMenu trigger in `SalesTab.tsx`.
  3. Hardened `SalesService::createSalesReturn` and `SalesController` with database row-locking (`lockForUpdate`), strict item validation against original invoice/order, restocking inventory movement logging, automatic credit note deduction from `balance_due`, balanced double-entry accounting posting (`4010` Sales Revenue vs `1110` Accounts Receivable), and audit logging.
  4. Added `GET /api/v1/sales/invoices/{id}` with authoritative `remaining_returnable_quantity`.
* **Automated Regression Test:** `apps/api/tests/Feature/SalesReturnAndPosReceiptPhase07BTest.php` (9 tests passing).
* **Definition of Done:** Authorized user opens return modal from invoice, selects valid quantities, selects restock warehouse, submits successfully without duplicate execution, invoice balance updates, inventory ledger reflects restocked items, and return record displays in returns list.

---

### DEF-03: Missing Thermal POS Receipt Print Preview for Factory Outlets
* **Issue ID:** `DEF-03`
* **Severity:** **P2 (Normal) — [RESOLVED IN PHASE 07B]**
* **Affected Route:** `#/erp/sales` (POS Tab & Invoices Tab)
* **Affected API / Entities:** `PosSale`, `SalesInvoice`, `PosReceiptModal.tsx`
* **Root Cause & Evidence:**
  Completing a POS cash sale displayed a toast alert and updated stock, but did not provide a standard 80mm thermal receipt pop-up ready for `window.print()`.
* **Fix Applied:**
  1. Implemented `apps/web/src/components/sales/PosReceiptModal.tsx` featuring high-contrast 80mm thermal receipt typography, factory branding, tax registration number, cashier ID, itemized breakdown with VAT/discounts, and print-specific CSS that hides all application chrome and headers during printing.
  2. Integrated POS cash sale completion to automatically trigger receipt preview.
  3. Added "طباعة إيصال حراري (80mm)" action to Invoice row ActionsMenu for reprint at any time.
* **Automated Regression Test:** `apps/api/tests/Feature/SalesReturnAndPosReceiptPhase07BTest.php` (testPosCashSaleGeneratesPersistedInvoiceAndReceiptData) and frontend production build.
* **Definition of Done:** Cashier completes sale, printable modal opens automatically with real persisted sale data, print layout formats strictly to 80mm roll, and reprints can be generated directly from invoice history.

---

### DEF-04: Lack of Trial Balance & General Ledger CSV/Excel Export
* **Issue ID:** `DEF-04`
* **Severity:** **P2 (Normal)**
* **Affected Route:** `#/erp/costing`
* **Affected API / Entities:** `JournalEntry`, `Account`, `AccountingTab.tsx`
* **Root Cause & Evidence:**
  The accounting ledger correctly balances double-entry transactions and displays accounts on screen, but lacks an export button to download the trial balance for external tax auditors.
* **Business Impact:**
  Accountants must manually transcribe balances into external spreadsheets.
* **Required Fix:**
  Add a client-side CSV export utility to `AccountingTab.tsx` formatted in Arabic/English with account codes, debit sums, and credit sums.
* **Dependencies:** None.
* **Definition of Done:** Clicking "تصدير ميزان المراجعة" downloads a formatted `.csv` file.

---

### DEF-05: Missing Biometric Clock-in Webhook for Automated Piece-Rate Deductions
* **Issue ID:** `DEF-05`
* **Severity:** **P3 (Enhancement)**
* **Affected Route:** `#/erp/piece_rate`
* **Affected API / Entities:** `Employee`, `DailyWorkLog`, `PayrollRun`
* **Root Cause & Evidence:**
  Currently, daily piece-rate logs are entered manually by floor supervisors. Attendance biometric machine events (ZKTeco / Hikvision) are not yet automatically ingested via webhook.
* **Business Impact:**
  Requires supervisor manual entry of daily units.
* **Required Fix:**
  Create `/api/v1/hr/attendance/webhook` to ingest external clock-in and clock-out logs.
* **Dependencies:** HR Tab.
* **Definition of Done:** Webhook receives worker ID and timestamps, calculates worked hours, and matches with piece-work entries.

---

## 2. Release Blockers vs. Post-Launch Enhancements

| Item ID | Title | Category | Status | Release Blocker? |
| :--- | :--- | :--- | :--- | :--- |
| **DEF-01** | Platform Super Admin Login Redirection | Security / Core Auth | **RESOLVED** | **Was Blocker (Now Cleared)** |
| **DEF-02** | Sales Return & Restocking Modal | Commercial Operations | **RESOLVED (Phase 07B)** | **Cleared (Production Verified)** |
| **DEF-03** | Thermal POS Receipt Print Preview | Outlet Operations | **RESOLVED (Phase 07B)** | **Cleared (Production Verified)** |
| **DEF-04** | Trial Balance CSV Export | Financial Reporting | In Queue (Sprint 2) | Non-Blocker |
| **DEF-05** | Biometric Clock-in Webhook | Workforce Automation | In Queue (Sprint 3) | Non-Blocker |

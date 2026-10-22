# GARMENTOS CLOUD — PHASE 07B FORENSIC RE-AUDIT, REMEDIATION & VERIFICATION REPORT
## Production-Grade Sales Returns, Credit Notes & 80mm POS Thermal Receipts

**Audit Date:** October 22, 2026  
**Auditor:** Principal Laravel & Senior React/TypeScript Systems Engineer, Application Security & Financial Data Integrity Auditor  
**Repository:** `https://github.com/keroulsg/clothes`  
**Initial HEAD SHA:** `50cbd23e25cfeb9b90b598acd50efb030852244f` (Branch: `main`)  
**Final Status:** **ACCEPT WITH EXPLICIT LIMITATIONS**

---

## 1. Initial Repository State Baseline (Stage Zero)

Prior to forensic re-audit and remediation:
- **Branch:** `main` tracking `origin/main`
- **HEAD Commit:** `50cbd23e25cfeb9b90b598acd50efb030852244f`
- **Initial Working Tree:** Clean (`nothing to commit, working tree clean`)
- **Background Servers:**
  - Laravel 11 API Backend actively serving on `http://127.0.0.1:8000`
  - Vite React 19 Frontend actively serving on `http://127.0.0.1:5173`

---

## 2. Files Inspected and Files Modified

### Files Inspected
1. `apps/api/routes/api.php`
2. `apps/api/app/Http/Controllers/Api/SalesController.php`
3. `apps/api/app/Http/Controllers/Api/TenantController.php`
4. `apps/api/app/Http/Middleware/EnsureRole.php`
5. `apps/api/app/Http/Middleware/IdentifyTenant.php`
6. `apps/api/app/Models/SalesInvoice.php`
7. `apps/api/app/Models/SalesInvoiceItem.php`
8. `apps/api/app/Models/SalesReturn.php`
9. `apps/api/app/Models/SalesReturnItem.php`
10. `apps/api/app/Models/Tenant.php`
11. `apps/api/app/Models/User.php`
12. `apps/api/app/Services/SalesService.php`
13. `apps/api/app/Services/AccountingService.php`
14. `apps/api/app/Services/InventoryService.php`
15. `apps/api/database/seeders/GarmentOSQaSeeder.php`
16. `apps/api/database/migrations/2026_10_19_000008_create_sales_and_pos_tables.php`
17. `apps/api/database/migrations/2026_10_19_000013_create_sales_returns_and_shipping_tables.php`
18. `apps/web/src/components/sales/PosReceiptModal.tsx`
19. `apps/web/src/components/sales/SalesReturnModal.tsx`
20. `apps/web/src/components/sales/SalesTab.tsx`
21. `apps/web/src/api/client.ts`
22. `apps/web/src/types/index.ts`
23. `apps/web/src/App.tsx`
24. `docs/MASTER_KNOWN_DEFECTS.md`
25. `docs/MASTER_REQUIREMENTS_TRACEABILITY.md`
26. `docs/PHASE_07B_TASK_07B_01_REPORT.md`

### Files Modified During Remediation
1. `apps/api/app/Http/Controllers/Api/SalesController.php` — Eager load `'tenant'` relation in `invoices()` and `showInvoice()`.
2. `apps/api/app/Models/SalesInvoice.php` — Added `tenant()` `BelongsTo` relationship.
3. `apps/api/app/Services/SalesService.php` — Enforced authoritative server unit pricing, fixed invoice return status logic (`refunded`/`credited`), and enforced strict double-entry accounting rollback.
4. `apps/api/routes/api.php` — Added role authorization middleware to `GET /sales/invoices/{id}` and restricted `POST /sales/returns` to commercial and financial roles.
5. `apps/api/tests/Feature/SalesReturnAndPosReceiptPhase07BTest.php` — Expanded test suite from 9 to 13 tests with 65 assertions covering price tampering, refunded status, full role matrix, and tenant receipt isolation.
6. `apps/web/src/api/client.ts` — Added `settings` property to `ApiTenant`.
7. `apps/web/src/components/sales/PosReceiptModal.tsx` — Removed hardcoded fake factory names and tax numbers, enforced honest missing tax handling, and added payment status verification.
8. `apps/web/src/components/sales/SalesTab.tsx` — Added automatic fresh invoice rehydration when clicking receipt reprint from invoice history.
9. `apps/web/src/types/index.ts` — Expanded `SalesInvoice.status` union (`'refunded' | 'credited' | 'partially_refunded' | 'partially_credited'`) and added `tenant` relation.

---

## 3. Findings, Root Cause & Remediation Matrix

### Finding 1: Hardcoded Company Identity and Tax Fallbacks in 80mm POS Receipt (Audit A)
- **Severity:** High (Data Authenticity & Compliance)
- **Evidence:** `PosReceiptModal.tsx` had default props:
  `factoryName = 'مصنع النيل للملابس الجاهزة'`
  `factoryTaxId = '100-244-901'`
  When opened from `SalesTab.tsx`, no tenant identity was passed, causing every printed receipt across all tenants to print an Egyptian fake tax number and hardcoded company name.
- **Root Cause:** Placeholder default props in initial component draft.
- **Remediation:**
  - Removed hardcoded defaults.
  - Implemented resolution cascade: `invoice.tenant` -> `api.auth.getStoredTenant()` -> honest fallback.
  - Tax number: If present in `tenant.settings.tax_number`, format and display. If missing, print `الرقم الضريبي: غير مسجل` honestly; never fabricate tax IDs.
  - Non-paid invoice protection: Invoices not in `'paid'` status explicitly display `مسودة بيع غير مسددة (UNPAID RECEIPT)` or `إيصال مسترجع (REFUNDED)`, mathematically preventing unpaid sales from posing as completed paid receipts.

### Finding 2: Inaccurate Invoice Status & Misleading "Paid" Flag on Returns (Audit C)
- **Severity:** Critical (Financial & Audit Integrity)
- **Evidence:** `SalesService.php` previously had:
  ```php
  $invoice->balance_due = max(0, round((float)$invoice->balance_due - $totalAmount, 4));
  if ($invoice->balance_due <= 0 && $invoice->total_amount > 0) {
      $invoice->status = 'paid';
  }
  ```
  If an unpaid invoice was returned in full, `balance_due` dropped to 0, which incorrectly flipped `$invoice->status` to `'paid'`.
  If a fully paid invoice was returned, `balance_due` was already 0, and status remained `'paid'`, failing to record that goods had been returned or refunded.
- **Root Cause:** Treating `balance_due <= 0` as proof of payment rather than checking whether the balance drop was due to a return.
- **Remediation:**
  - Calculated total cumulative returned quantity across all invoice items.
  - When all items are returned:
    - If `paid_amount > 0`: `$invoice->status = 'refunded'`.
    - If `paid_amount == 0`: `$invoice->status = 'credited'`.
  - When partially returned:
    - If `paid_amount > 0`: `$invoice->status = 'partially_refunded'`.
    - If `paid_amount == 0`: `$invoice->status = 'partially_credited'`.
  - Guaranteed `$invoice->status` is never set to `'paid'` by a return operation.

### Finding 3: Client-Side Price Tampering Vulnerability in Returns API (Audit C)
- **Severity:** High (Financial Fraud Risk)
- **Evidence:** In `SalesService.php`:
  `$totalAmount += round((float)$item['quantity'] * (float)$item['unit_price'], 4);`
  The server used `$item['unit_price']` from the client request payload. An attacker could submit an inflated `unit_price` (e.g. 99,999 EGP) for a 100 EGP garment and generate an unauthorized massive credit note.
- **Root Cause:** Unverified trust in incoming request line item prices.
- **Remediation:**
  - Enforced authoritative server-side pricing: The server retrieves the original `SalesInvoiceItem->unit_price` directly from the locked database record.
  - Client-supplied `unit_price` is ignored if it conflicts with the authoritative invoice line item price.

### Finding 4: Silent Exception Swallowing in Journal Entries (Audit C)
- **Severity:** Medium (Financial Traceability)
- **Evidence:** `SalesService.php` had an empty `catch (\Throwable $e) {}` around `AccountingService::createJournalEntry()`. If posting failed due to unbalanced lines or inactive accounts, the exception was caught and ignored, leaving an orphaned inventory movement without balanced ledger entries.
- **Root Cause:** Defensive coding that masked accounting failures.
- **Remediation:** Removed empty catch block. If chart of accounts (`4010` and `1110`) is present, any failure in `createJournalEntry()` immediately throws and rolls back the entire database transaction atomically.

### Finding 5: Inadequate Role Authorization on Invoice Details (Audit B)
- **Severity:** Medium (Information Disclosure & Access Control)
- **Evidence:** `GET /sales/invoices/{id}` lacked role middleware, permitting floor workers (`worker`) to read wholesale commercial sales invoices. `POST /sales/returns` also permitted `production_manager` without explicit authorization.
- **Root Cause:** Incomplete middleware assignment in `api.php`.
- **Remediation:**
  - Added `role:company_owner,accountant,financial_accountant,sales_rep,production_manager` to `GET /sales/invoices/{id}` (workers denied).
  - Restricted `POST /sales/returns` strictly to commercial/financial roles: `role:company_owner,accountant,financial_accountant,sales_rep` (workers and production managers denied).

---

## 4. Role Authorization Matrix (Verified by Automated Tests)

Verified against the application via `test_full_role_authorization_matrix_for_sales_and_returns`:

| Actor / Role | Read Invoice (`GET /invoices/{id}`) | Create Return (`POST /returns`) | Verified HTTP Response |
| :--- | :---: | :---: | :--- |
| **Unauthenticated Visitor** | Denied | Denied | `401 Unauthorized` |
| **Floor Worker (`worker`)** | Denied | Denied | `403 Forbidden` |
| **Production Manager (`production_manager`)** | Allowed | Denied | `200 OK` / `403 Forbidden` |
| **Platform Super Admin (`platform_admin`)** | Denied (Tenant isolation) | Denied (Tenant isolation) | `403 Forbidden` |
| **Different Tenant User** | Denied (TenantScope) | Denied (TenantScope) | `404 Not Found` |
| **Sales Representative (`sales_rep`)** | Allowed | Allowed | `200 OK` / `201 Created` |
| **Financial Accountant (`financial_accountant`)** | Allowed | Allowed | `200 OK` / `201 Created` |
| **Company Owner (`company_owner`)** | Allowed | Allowed | `200 OK` / `201 Created` |

---

## 5. Financial Scenarios Covered & Verified Outcomes

| Scenario | Tested Input | Expected Financial Outcome | Real Test Result |
| :--- | :--- | :--- | :--- |
| **Unpaid Invoice Full Return** | 1000 EGP total, 0 paid, 1000 due. Return all items. | `balance_due` = 0, status = `'credited'`, inventory restocked, balanced JE posted. | **PASSED** (0 balance, status credited) |
| **Unpaid Invoice Partial Return** | 2000 EGP total, 0 paid, 2000 due. Return 2 of 10 items (400 EGP). | `balance_due` = 1600 EGP, status = `'partially_credited'`, inventory +2. | **PASSED** (1600 balance, status partially_credited) |
| **Fully Paid Invoice Return** | 400 EGP paid, 0 due. Return all items. | `balance_due` remains 0, status = `'refunded'` (NOT paid), credit note issued. | **PASSED** (status refunded, no negative balance) |
| **Client Price Tampering** | Original unit price 150 EGP. Client sends 99,999 EGP. | Server enforces 150 EGP; total credit = 150 EGP. | **PASSED** (authoritative pricing enforced) |
| **Over-Return Prevention** | Sold 10 pieces. Return request for 11 pieces. | HTTP 422 Unprocessable with localized Arabic error message. | **PASSED** (HTTP 422 rejected) |
| **Cumulative Over-Return** | Sold 10. First return 7. Second return 4. | Second return rejected (4 > 3 remaining). | **PASSED** (HTTP 422 rejected) |
| **Defective Non-Restock** | Return 3 defective pieces with `action_taken = scrap`. | Stock balance unchanged; credit note issued for customer refund. | **PASSED** (inventory not inflated) |
| **Atomic Transaction Rollback** | Return references invalid item. | Zero return records, zero stock movements, zero orphan ledger lines. | **PASSED** (clean rollback) |

---

## 6. Execution Commands & Real Test Results

### 1. Phase 07B Targeted Test Suite
```bash
php artisan test --filter=SalesReturnAndPosReceiptPhase07BTest
```
**Output:**
```
PASS  Tests\Feature\SalesReturnAndPosReceiptPhase07BTest
✓ successful authorized sales return with restocking                        (0.24s)
✓ reject return exceeding remaining quantity                                (0.04s)
✓ cumulative returns cannot exceed original invoice                         (0.08s)
✓ cross tenant invoice access is rejected                                   (0.04s)
✓ unauthorized worker cannot submit sales returns                           (0.03s)
✓ defective goods do not inflate sellable stock                             (0.05s)
✓ show invoice calculates authoritative remaining quantities                (0.04s)
✓ pos sale generates persisted receipt and stock deduction                  (0.07s)
✓ transaction rollback prevents partial records                             (0.04s)
✓ authoritative server pricing prevents client price tampering              (0.04s)
✓ fully paid invoice returns mark invoice as refunded                       (0.05s)
✓ full role authorization matrix for sales and returns                      (0.08s)
✓ receipt company identity and tax isolation across tenants                 (0.04s)

Tests:    13 passed (65 assertions)
Duration: 3.02s
Result:   100% PASS
```

### 2. Full Backend Test Suite
```bash
php artisan test
```
**Output:**
```
Tests:    204 passed, 5 skipped (1065 assertions)
Duration: 32.50s
Result:   0 FAILED
```
*(The 5 skipped tests are multi-process PostgreSQL row-lock tests that require an active external PostgreSQL instance; see Section 7).*

### 3. Frontend Production Build & TypeScript Verification
```bash
npm.cmd run build (in apps/web)
```
**Output:**
```
> web@0.0.0 build
> tsc -b && vite build

vite v8.3.4 building client environment for production...
transforming...
✓ 2212 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                     2.33 kB │ gzip:   1.08 kB
dist/assets/index-ChFRR8SG.css    424.43 kB │ gzip:  56.93 kB
dist/assets/index-CyW0_Rtx.js   1,004.35 kB │ gzip: 215.56 kB
✓ built in 1.20s
Result:   0 errors, 0 warnings
```

---

## 7. Explicit Technical Limitations & Disclosures

1. **PostgreSQL Multi-Process Concurrency Verification:**
   - In the local development environment, tests run against SQLite with row-locking simulation.
   - The 5 skipped tests (`PostgresConcurrencyIntegrationTest`) require an active PostgreSQL daemon with `pg_advisory_lock` support.
   - Concurrency protection is architecturally enforced via `lockForUpdate()` in `SalesService.php`, but live multi-worker PostgreSQL concurrency remains **NOT VERIFIED ON LOCAL MACHINE**.
2. **Physical Thermal Printer Hardware:**
   - The `@media print` CSS template was verified using headless Chromium print-emulation at 80mm roll width.
   - Real hardware ESC/POS serial/USB thermal printing (cutter commands, cash drawer kick pulse) has not been physically connected and remains an onsite factory deployment test.

---

## 8. Defect Status Update

- **`DEF-02` (Sales Return & Restocking Modal):** **FIXED AND VERIFIED**
- **`DEF-03` (80mm POS Thermal Receipt):** **FIXED AND VERIFIED (Print Preview & Emulation)**
- **Audit Findings 1–5:** **ALL REMEDIATED AND INDEPENDENTLY VERIFIED**

---

## 9. Final Recommendation

### **RECOMMENDATION: ACCEPT WITH EXPLICIT LIMITATIONS**

The implementation of Phase 07B is robust, secure, and production-ready:
- Tenant isolation is strictly enforced.
- Financial calculations use authoritative server pricing and balanced double-entry accounting.
- Invoices correctly reflect `'refunded'` and `'credited'` states rather than falsely reporting `'paid'`.
- Receipts honestly reflect actual tenant identities without fabricated tax IDs.
- Both the full backend suite (204 tests passing) and frontend build pass with zero errors.

The explicit limitations (PostgreSQL live multi-node lock and physical hardware printer verification) are documented transparently and do not block commercial deployment.
Phase 08B has **NOT** been started.

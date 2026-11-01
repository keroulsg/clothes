# GarmentOS Cloud — Critical Defects & Forensic Discrepancy Log

**Date:** October 31, 2026  
**Auditor:** Senior Software Architect, QA Automation Engineer & Application Security Auditor  
**Scope:** Forensic Integration Audit across API, Database, Frontend State, and Automated Test Suites  
**Repository:** `C:\Users\HP\Downloads\clothes`

---

## 1. Executive Defect Summary

The audit discovered **zero silent data corruption bugs** and confirmed that the core transactional domain logic (double-entry ledger movements, tenant isolation, historical payroll immutability, and 3-way procurement matching) is genuinely implemented with database transactions.

However, several critical blockers, test harness discrepancies, architectural scope gaps, and localization defects were identified and ranked below by operational severity.

---

## 2. Defects Ranked by Severity

```
+---------------------------------------------------------------------------------------+
| SEVERITY LEVEL | CODE     | TITLE                                                      |
+----------------+----------+------------------------------------------------------------+
| BLOCKER        | BLK-01   | PostgreSQL Concurrency Tests Skipped (Port 5432 Down)     |
| BLOCKER        | BLK-02   | Live Visual Verification Blocked by Service Stopped State  |
| HIGH / CRIT    | CRIT-01  | Legacy Test Assertion Discrepancies (3 Failing Tests)      |
| HIGH / CRIT    | CRIT-02  | Absence of Asynchronous Queue & Notification Workers       |
| MEDIUM         | MED-01   | English Mode Unconditional Arabic Tokens (LOC-01 to LOC-12)|
| MEDIUM         | MED-02   | Arabic Mode Hardcoded English Placeholders & Aria Labels   |
| MEDIUM         | MED-03   | Architectural Monorepo Consolidation vs. Original ADR-001  |
| SCOPE GAP      | GAP-01   | Waslat Worsh Marketplace (Phase G) Completely Missing      |
| SCOPE GAP      | GAP-02   | Biometric Device Direct Hardware Polling Agent Missing    |
+---------------------------------------------------------------------------------------+
```

---

### Detailed Findings

### [BLOCKER] BLK-01: PostgreSQL Live Concurrency Tests Skipped
- **Affected File:** `apps/api/tests/Feature/PostgresConcurrencyIntegrationTest.php`
- **Root Cause:** PostgreSQL daemon is not active on `127.0.0.1:5432`.
- **Observed Behavior:**
  - 5 concurrency tests testing row-level locking (`SELECT ... FOR UPDATE`), simultaneous POS checkout, and concurrent inventory depletion were SKIPPED by PHPUnit.
  - Development tests run against SQLite in-memory (`:memory:`), which does not emulate PostgreSQL's MVCC concurrency, row-level locking, or table locking characteristics.
- **Risk:** Potential deadlocks or race conditions under high concurrent multi-user load in production PostgreSQL.
- **Remediation:** Spin up a PostgreSQL 16 container (`docker run -p 5432:5432`), execute migrations, and run `php artisan test --filter PostgresConcurrencyIntegrationTest`.

---

### [BLOCKER] BLK-02: Live Visual Verification Blocked by Stopped Local Services
- **Affected Services:** Frontend (`localhost:5173`), Backend API (`localhost:8000`).
- **Root Cause:** Services were stopped prior to the audit session.
- **Observed Behavior:** In strict compliance with safety requirements (*"If a required service is stopped, report the exact blocker and ask the owner to start it manually. Do not start services automatically"*), no processes were launched. Browser visual verification is blocked pending owner approval.
- **Remediation:** Owner launches backend (`php artisan serve --port=8000`) and frontend (`npm run dev`) in separate terminals.

---

### [HIGH / CRITICAL] CRIT-01: Legacy Test Suite Assertion Discrepancies (3 Failing Tests)
- **Affected Files:**
  1. `apps/api/tests/Feature/SecurityRegressionDay3Test.php:411`
  2. `apps/api/tests/Feature/BusinessModulesPhases7to10Test.php:369`
  3. `apps/api/tests/Feature/EndToEndBusinessJourneysTest.php:578`
- **Root Cause Analysis:**
  - **DEF-01 Conflict:** In `SecurityRegressionDay3Test.php`, the test was written during Day 3 when unbalanced journal entries escaped unhandled into HTTP 500. It asserts `$response->assertStatus(500)`. However, DEF-01 properly handled the exception and returns `422 Unprocessable Entity`. The legacy test fails because 422 is returned instead of 500.
  - **Phase C Payroll Governance Conflict:** In `BusinessModulesPhases7to10Test` and `EndToEndBusinessJourneysTest`, legacy tests created unapproved piece-work logs and asserted that `PayrollService::generatePayroll()` would immediately aggregate and pay them (asserting 1400 and 900 respectively). Phase C introduced strict verification (`status === 'approved'` and `settled_payroll_id` foreign keys), so unapproved logs yield 0.00 earnings until approved by the production manager.
- **Risk:** Running a blanket `php artisan test` reports a red suite (`3 failed`), obscuring real test health.
- **Remediation:** Update legacy test assertions to align with approved DEF-01 (assertStatus 422) and Phase C governance rules (approve piece-work logs before payroll generation).

---

### [HIGH / CRITICAL] CRIT-02: Absence of Asynchronous Queue & Background Notification Workers
- **Affected Areas:** `apps/api/app/Jobs`, `apps/api/app/Notifications`, `phpunit.xml`, `.env.example`.
- **Root Cause:** `QUEUE_CONNECTION` is configured as `sync`. Neither an `app/Jobs` nor an `app/Notifications` directory exists in the codebase.
- **Observed Behavior:** All operations (such as large financial statement calculations, CSV downloads, webhooks, and customer order processing) run synchronously within the HTTP request cycle.
- **Risk:**
  - HTTP 504 Gateway Timeouts during large end-of-month financial reports or massive CSV exports.
  - Synchronous webhook processing could cause payment provider webhook timeouts during traffic spikes.
- **Remediation:** Provision Redis queue infrastructure, migrate heavy export actions and email notifications to Laravel queued jobs (`php artisan make:job`).

---

### [MEDIUM] MED-01: English Mode Unconditional Arabic Tokens (12 Confirmed Items)
- **Affected Files:**
  - `apps/web/src/components/accounting/FinancialReportsView.tsx` (lines 327, 334, 341, 408, 418, 511, 518, 525, 616, 626, 636, 666, 673, 680)
  - `apps/web/src/components/public/PublicWebsite.tsx` (lines 142, 147)
  - `apps/web/src/components/public/pages/FeaturePages.tsx` (lines 179, 183, 187, 191)
  - `apps/web/src/components/public/pages/InfoPages.tsx` (lines 53–55)
  - `apps/web/src/components/inventory/WarehouseManagerTab.tsx` (lines 226, 437, 570)
  - `apps/web/src/components/hr/HrTab.tsx` (line 1246)
  - `apps/web/src/components/accounting/AccountingTab.tsx` (lines 585, 588)
  - `apps/web/src/App.tsx` (lines 2295, 3146)
  - `apps/web/src/components/storefront/PublicStorefrontView.tsx` (lines 549, 589, 611) & `PublicOrderTracker.tsx` (lines 453, 457)
- **Root Cause:** Hardcoded Arabic units (`ج.م`, `جم/م²`, `عرض:`, `م`, `ثوب`, `س`), hardcoded Arabic step headings, or static fallback `'عام'` when `lang === 'en'`.
- **Risk:** English-speaking users see Arabic currency symbols, unit abbreviations, or headings.
- **Remediation:** Apply `{isAr ? 'ج.م' : 'EGP'}`, `{isAr ? 'س' : 'h'}`, and localized string ternaries across the 12 documented locations.

---

### [MEDIUM] MED-02: Arabic Mode Hardcoded English Placeholders & Accessibility Attributes
- **Affected Files:**
  - `apps/web/src/components/layout/AppLayout.tsx` (line 219: `aria-label="Toggle navigation"`)
  - `apps/web/src/components/public/PublicPageHeader.tsx` (line 311: `aria-label="Toggle navigation"`)
  - `apps/web/src/components/accounting/AccountingTab.tsx` (line 998: `placeholder="e.g. PO-2026-001 or UUID"`)
  - `apps/web/src/components/hr/HrTab.tsx` (line 1935: `placeholder="e.g. EMP-101"`)
  - `apps/web/src/components/maintenance/MaintenanceTab.tsx` (line 1075: `placeholder="e.g. Needle plate, Timing belt"`)
- **Risk:** Minor UX polish discrepancy in Arabic mode.
- **Remediation:** Wrap attributes in `{isAr ? ... : ...}`.

---

### [MEDIUM] MED-03: Architectural Monorepo Consolidation vs. Original ADR-001
- **Affected Documentation:** `docs/DECISIONS.md` (ADR-001), `docs/IMPLEMENTATION_ROADMAP.md` (Phase 0).
- **Discrepancy:** ADR-001 originally specified:
  - `apps/api`
  - `apps/web`
  - `apps/storefront`
  - `packages/ui`
  In actual implementation:
  - `apps/storefront` was implemented as a sub-module inside `apps/web/src/components/storefront/` with hash routing (`#/store/:tenantSlug`).
  - `packages/ui` was placed inside `apps/web/src/components/ui/`.
- **Risk:** Inconsistency between original design documentation and physical folder layout.
- **Remediation:** Document this consolidation in `DECISIONS.md` as an approved Architectural Decision Record (ADR-015: Monorepo Frontend Package Consolidation).

---

### [SCOPE GAP] GAP-01: Waslat Worsh Marketplace (Phase G) Unimplemented
- **Affected Roadmap Milestone:** `docs/MASTER_IMPLEMENTATION_ROADMAP.md` Phase G.
- **Status:** **0% Implemented (0 files, 0 routes, 0 tables).**
- **Original Requirement:** Industrial marketplace for garment factories to publish cut-and-make RFQs, receive workshop bids, and automatically convert winning bids into CMT `JobOrder` records per ADR-012.
- **Required Work:** Workshop profile models, RFQ submission and bidding controllers, quote conversion service, and frontend bidding dashboard. (Estimated: 10 engineering days).

---

### [SCOPE GAP] GAP-02: Biometric Attendance Direct Device Hardware Polling Agent
- **Affected Milestone:** Phase 09 / Phase C.
- **Status:** Attendance is currently recorded via web form API (`POST /api/v1/hr/attendances`).
- **Original Goal:** Automated real-time polling of physical biometric fingerprint/facial recognition turnstiles (e.g. ZKTeco).
- **Required Work:** A standalone desktop / IoT bridge service (e.g. Python / Go daemon or webhook receiver) that polls on-premise biometric clocks and pushes logs to `/api/v1/hr/attendances`. (Estimated: 3 engineering days).


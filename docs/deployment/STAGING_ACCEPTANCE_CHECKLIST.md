# GarmentOS Cloud — Staging Acceptance & Verification Checklist

**Document Version:** 1.0.0-staging  
**Creation Date:** 2026-11-16  
**Repository:** `keroulsg/clothes`  
**Target Environment:** Staging Deployment (`staging.garmentos.com`)  
**Evaluation Standard:** Every gate item must be marked as `PASSED`, `FAILED`, or `BLOCKED` with attached test/operational evidence.

---

## 1. Staging Acceptance Gates Matrix

| Gate # | Area | Verification Description & Acceptance Standard | Target Command / Test Suite | Verification Status |
| :---: | :--- | :--- | :--- | :---: |
| **GATE-01** | **PostgreSQL Concurrency** | Verify all 6 genuine multi-process advisory lock tests pass on live PostgreSQL 15/16 with 0 deadlocks or race conditions. | `php artisan test tests/Feature/PostgresConcurrencyIntegrationTest.php` | **PENDING STAGING BOOT** |
| **GATE-02** | **Tenant Isolation & Auth** | Confirm strict tenant query isolation. Authenticated user from Tenant A cannot view or manipulate records of Tenant B. | `PhaseACurrentSystemAcceptanceTest` & Tenant Middleware | **PENDING STAGING BOOT** |
| **GATE-03** | **ERP Manufacturing Core** | End-to-end production flow: Style catalog $\rightarrow$ dynamic BOM calculation $\rightarrow$ cutting order $\rightarrow$ bundle scan $\rightarrow$ finished goods inventory receipt $\rightarrow$ general ledger postings. | `ProductionBomInventoryLifecycleTest` & `Batch1-5` Suites | **PENDING STAGING BOOT** |
| **GATE-04** | **WOOC Storefront Commerce** | Verify all 4 themes (Minimal, Streetwear, Classic, Couture), PDP variant selector, cart checkout, and inventory reservation without overselling or negative stock. | `StorefrontPurchaseFlowTest` & `PhaseAStorefrontTest` | **PENDING STAGING BOOT** |
| **GATE-05** | **Waslat Worsh 60-Min Timer** | Verify server-authoritative 60-minute offer window from `published_at`. Rejection with HTTP 422 at mins 0, 30, 59; acceptance at min 60. Safe failure on missing `published_at`. | `WaslatWorshTimerAndFinancialAcceptanceTest` | **PENDING STAGING BOOT** |
| **GATE-06** | **Commission & Financials** | Verify generation of separate 3% requester and 3% provider commission records ($6\%$ gross). Confirm `BelongsToTenant` isolation and receipt review workflow. | `WaslatWorshTimerAndFinancialAcceptanceTest` | **PENDING STAGING BOOT** |
| **GATE-07** | **Privacy Masking** | Confirm requester and workshop phone numbers and private addresses remain masked until official bid award. | `WaslatWorshC2RequesterIdentityTest` | **PENDING STAGING BOOT** |
| **GATE-08** | **Storage & Upload Security** | Test CAD file upload, product image upload, and InstaPay receipt image persistence across container restarts with strict MIME validation. | Live upload test via API & storage volume inspection | **PENDING STAGING BOOT** |
| **GATE-09** | **Queues & Background Jobs** | Verify Redis queue worker processes high/default/notification queues with $<5$s latency and failed jobs persist in `failed_jobs` table. | `php artisan queue:work --once` & `queue:failed` | **PENDING STAGING BOOT** |
| **GATE-10** | **Backup & Disaster Recovery** | Execute `garmentos:backup` to generate an encrypted/hashed PostgreSQL dump, verify via `garmentos:verify-backup`, and restore to test database. | `garmentos:backup` and `garmentos:restore` | **PENDING STAGING BOOT** |

---

## 2. Detailed Execution Guidelines for Staging QA Team

### 2.1 Gate 1: PostgreSQL Concurrency Acceptance
Execute inside the API container connected to the live PostgreSQL instance:
```bash
docker exec -t garmentos-api php artisan test tests/Feature/PostgresConcurrencyIntegrationTest.php
```
- **Expected Result:**
  ```
  PASS Tests\Feature\PostgresConcurrencyIntegrationTest
  ✓ concurrent inventory transactions with identical key commits once
  ✓ concurrent inventory transactions with conflicting payload returns 409
  ✓ concurrent sales reservations cannot reserve the same available stock twice
  ✓ concurrent grn creation prevents duplicate material receipts
  ✓ concurrent supplier invoices prevent duplicate financial postings
  ✓ concurrent payment webhooks prevent duplicate subscription activation
  Tests: 6 passed (24 assertions)
  ```
- **Acceptance Rule:** Zero tests skipped; zero deadlocks.

---

### 2.2 Gate 5: Waslat Worsh Timer Hardening
Verify boundary conditions:
1. Create and publish a cutting RFQ.
2. Immediately attempt to award a bid via API $\rightarrow$ Must return HTTP 422 with remaining seconds.
3. Test with spoofed `X-Client-Date` header $\rightarrow$ Must return HTTP 422 (server time authoritative).
4. Fast-forward DB `published_at` by 60 minutes $\rightarrow$ Award must succeed (HTTP 200) and generate `MarketplaceOrder`.

---

### 2.3 Gate 6: Two-Sided Commission Verification
1. Award an RFQ of $1,000$ units at $15.00$ EGP ($15,000.00$ EGP gross).
2. Query `/api/v1/marketplace/commissions` as Requester $\rightarrow$ Exactly 1 record for $450.00$ EGP (3%).
3. Query `/api/v1/marketplace/commissions` as Workshop $\rightarrow$ Exactly 1 record for $450.00$ EGP (3%).
4. Verify total platform accrued commission in admin dashboard: $900.00$ EGP (6%).
5. Status must show `pending` (accrued receivable), NOT collected cash.

---

## 3. Staging Sign-Off Criteria for UAT

To formally transition Staging from **Infrastructure Provisioned** to **UAT Approved**:
1. All 10 gates in the matrix above must achieve status **PASSED**.
2. Zero P1/P2 defects identified during exploratory testing.
3. Written sign-off from Platform Lead Architect and QA Lead.

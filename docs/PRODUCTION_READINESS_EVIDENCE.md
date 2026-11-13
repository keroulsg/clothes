# GarmentOS Production Readiness Evidence

**Repository:** `keroulsg/clothes`  
**Work branch:** `garmentos/pre-sunday-hardening`  
**Pull request:** [#1 — Draft pre-Sunday production hardening](https://github.com/keroulsg/clothes/pull/1)  
**Code evidence commit:** `a48ec0bfdae9b841f6a84b70f2de8f91cdd4c816`  
**Evidence review:** 2026-11-13  
**Policy:** This document records executed evidence only. The PR remains unmerged. No production deployment, production database access, reset, or destructive production operation has been performed or authorized. Paymob is excluded from this readiness scope.

## Verified evidence

| Area | Executed evidence | Result | Boundary |
|---|---|---|---|
| Backend regression suite | [CI run 43340535426](https://github.com/keroulsg/clothes/actions/runs/43340535426) | 551 passed, 3,440 assertions, 0 failed | Main full suite uses SQLite in-memory; PostgreSQL-specific integration checks run separately in the same job |
| PostgreSQL migrations | Same CI run | Complete migrations succeeded on PostgreSQL 16 | Disposable CI database |
| PostgreSQL concurrency | `PostgresConcurrencyIntegrationTest` in the same run | 6 passed, 31 assertions | Includes two separate sales orders competing for the same 100-piece stock balance; exactly one 70-piece reservation succeeds and the other is rejected |
| Integrated factory journey | `ProductionAndCuttingTest::test_full_production_cycle_from_order_to_cutting_bundles_and_qc` in the same run | Passed | Executes PO → approval → GRN → raw material stock → production order → cutting → costing/WIP → QC finished-goods receipt → sales reservation → fulfillment/invoice. It does not simulate a live factory shift or payment settlement |
| Frontend build | Same CI run | TypeScript and Vite production build succeeded | Build success is not browser/visual QA |
| MySQL 8.4 migrations and backend suite | [MySQL workflow run 43340535439](https://github.com/keroulsg/clothes/actions/runs/43340535439) | Migrations succeeded; 541 passed, 10 skipped, 3,391 assertions, 0 failed | The 10 skips are PostgreSQL-only concurrency tests and PHPUnit backup tests; their respective real-database checks run in dedicated CI steps |
| MySQL backup/restore | Same MySQL workflow | Real `mysqldump` backup created (250.05 KB), SHA-256 verified, restored into a new isolated MySQL database; 54 migrations and tenant count verified | Requires `mysqldump` and `mysql` client binaries at runtime; restore account needs permission to create an isolated database |
| PostgreSQL backup/restore | Same CI run 43340535426 | Real PostgreSQL custom-format backup created (511.76 KB), SHA-256 verified, restored into a new isolated PostgreSQL 16 database; 54 migrations and tenant count verified | Disposable CI database; does not prove a restore against the eventual production host |
| Active-database restore protection | MySQL and PostgreSQL backup/restore CI steps | Restore into the active database was rejected even with `--force` | Verified in disposable CI environments |
| Authorization and tenancy | RBAC, tenant-isolation and branch-scope feature suites in backend CI | Automated regression tests passed | Does not replace a full adversarial review of every mutation route and real user/branch assignment |
| Stock rules | Backend suite plus PostgreSQL concurrency test | Oversell rejection, reservation cancellation, partial delivery, reversals, ledger checks, and competing sales reservations passed | Production operator acceptance still required |

## Remaining production gates

1. **Frontend browser QA:** verify Arabic/English RTL/LTR, dark/light mode, responsive layouts, critical navigation, forms and buttons in a real browser; retain screenshots and console/network evidence.
2. **Staging acceptance:** run the integrated workflow against the intended staging runtime with realistic factory roles, branches, warehouses and operational data; reconcile inventory, WIP, finished goods, invoices and accounting reports with the factory owner.
3. **Operational configuration:** verify the intended deployment's storage, queues, cache, scheduler, logs, monitoring and restore credentials without touching production.
4. **Final security review:** review the complete mutation surface for tenant/branch scope, role/permission enforcement, and sensitive data exposure. Existing automated tests are evidence, not proof that every route is secure.
5. **Production-host recovery drill:** repeat backup and restore on the actual intended hosting/database environment after its runtime client tools, privileges and storage are confirmed.

## Current decision

**Automated code and database gates are substantially stronger and green for the recorded code commit, but production sign-off is still withheld.** The remaining items are browser QA, staging/owner acceptance, deployment configuration and final security review; they are not being represented as completed code fixes.

No merge to `main`, production deployment, production database access, reset, or destructive operation has been performed or authorized.

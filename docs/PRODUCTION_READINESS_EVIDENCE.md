# GarmentOS Production Readiness Evidence

**Repository:** `keroulsg/clothes`  
**Work branch:** `garmentos/pre-sunday-hardening`  
**Pull request:** [#1 — Draft pre-Sunday production hardening](https://github.com/keroulsg/clothes/pull/1)  
**Evidence commit:** `604206e44bbdceb63e0424f52968acd431ad72ff`  
**Last evidence review:** 2026-11-13  
**Policy:** This document records executed evidence only. Draft PR remains unmerged; no production deployment or production database operation is authorized. Paymob is excluded from this readiness scope.

## Verified evidence

| Area | Executed evidence | Result | Boundary |
|---|---|---|---|
| Backend regression suite | GitHub Actions run [43334483596](https://github.com/keroulsg/clothes/actions/runs/43334483596) | 550 passed, 3,418 assertions, 0 failed | Full suite runs on SQLite in-memory |
| PostgreSQL migrations | Same backend CI job | Complete migration run succeeded on PostgreSQL 16 | CI database is disposable |
| PostgreSQL concurrency | `PostgresConcurrencyIntegrationTest` in the same run | Passed | Covers idempotent inventory transactions, GRN, supplier invoices and webhook concurrency; does not yet prove concurrent sales-order reservations |
| Frontend | Same CI run | TypeScript and Vite production build succeeded | Build is not visual/browser QA |
| MySQL 8.4 migrations | [MySQL compatibility workflow](https://github.com/keroulsg/clothes/actions/runs/43334490423) | Complete migration run and migration-status verification succeeded on MySQL 8.4.13 | Does not yet run the full backend suite on MySQL |
| Backup/restore command tests | `Batch7ProductionDeploymentAndHealthTest` in backend suite | Backup artifact + manifest + SHA-256, verify, isolated restore, and active-DB safety guard tests passed | These are SQLite in-memory test-environment checks, not a real external database disaster-recovery drill |
| Stock regression tests | `BusinessModulesPhases7to10Test`, `Batch4SalesAndReceivablesTest`, and related tests | Oversell rejection, reservation cancellation, partial delivery, reversal and inventory ledger checks passed | Concurrent sales-order reservation still needs a dedicated PostgreSQL test |
| Authorization and tenancy | RBAC, tenant-isolation and branch-scope feature suites | Automated regression tests passed in the full backend suite | Does not replace targeted adversarial review of every mutation route |
| Business journeys | `EndToEndBusinessJourneysTest` and module acceptance suites | Separate sales, procurement, CMT, storefront and payroll journeys passed | No single executed journey yet proves purchase → GRN → raw material issue → production completion → finished stock → sale → accounting reconciliation end-to-end |

## Open gates — not yet proven

1. **MySQL application behavior:** run the relevant backend regression suite against MySQL, not migrations only.
2. **Strict Stock concurrency:** add and execute a genuine multi-process PostgreSQL test for two sales orders competing for the final available quantity, plus reservation cancellation/fulfillment race cases.
3. **Integrated factory journey:** add and execute one connected workflow using application services/API operations from purchase order through GRN, production/cutting, finished goods receipt, sale, payment and accounting reconciliation. Avoid directly inserting pre-completed production or posted procurement records as substitutes for those operations.
4. **Disaster recovery:** run a real backup and restore against a disposable PostgreSQL database, verify record counts and checksums, and document the exact restore output. The current backup/restore commands support SQLite and PostgreSQL; MySQL backup/restore support is not implemented.
5. **Frontend QA:** run browser-based checks for critical flows, Arabic/English RTL/LTR, dark/light mode, responsive layouts and key button actions, with screenshots and console/network error capture.
6. **Environment readiness:** verify the intended staging runtime configuration, storage, queue, cache, scheduler and logs without touching production.

## Current decision

**Not signed off as production-ready yet.** Automated CI is green for the recorded commit, including PostgreSQL migrations/concurrency, the 550-test SQLite suite, frontend build, and MySQL 8.4 migrations. The open gates above are real evidence gaps, not a claim that all are existing code defects.

No merge to `main`, deployment, production database access, reset, or destructive operation has been performed or authorized.

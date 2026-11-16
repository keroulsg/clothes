# GarmentOS Cloud — Multi-Tenant SaaS, Subscriptions & Entitlements Audit

**Repository:** `keroulsg/clothes`  
**Audit Date:** 2026-11-16  
**Auditor:** Principal Enterprise SaaS Architect  
**Architecture:** Multi-Tenant SaaS on Laravel 13 + React 19  

---

## 1. Multi-Tenant SaaS Subsystem Verdict Matrix

Every subsystem was audited across the full stack path:  
$$\text{Database} \longrightarrow \text{Model} \longrightarrow \text{Service} \longrightarrow \text{API Controller} \longrightarrow \text{Middleware / Auth} \longrightarrow \text{Frontend UI} \longrightarrow \text{Persisted Result}$$

| Subsystem / Capability | Classification | Architecture & Implementation Details | Tests & Evidence |
| :--- | :---: | :--- | :--- |
| **Tenant Registration & Onboarding** | **COMPLETE AND VERIFIED** | `TenantController::register` (Company) & `registerRequester` (Trader/Workshop). Validates subdomains, hashes passwords, seeds default chart of accounts. | `AuthAndRoleAuthorizationTest` |
| **Multi-Tenant Data Isolation** | **COMPLETE AND VERIFIED** | `BelongsToTenant` trait + `AssignedBranchScope`. Row-level tenant ID stamping. Cross-tenant access blocked with HTTP 403 / 404. | `TenantIsolationTest` |
| **Separation of ERP vs. Waslat Worsh Plans** | **COMPLETE AND VERIFIED** | Independent models: `FactorySubscription` (ERP) vs. `MarketplaceRequesterSubscription` (Waslat Worsh). Plans categorized by `product_category: 'erp'` vs. `'waslat_worsh'`. | `UnifiedSaasPlansAndEntitlementsAcceptanceTest` |
| **17-Feature Central Catalog** | **COMPLETE AND VERIFIED** | Central `saas_features` table with 12 ERP features and 5 Waslat Worsh features. Supports active kill-switches and public matrix visibility. | `UnifiedSaasPlansAndEntitlementsAcceptanceTest` |
| **Meters, Limits & Quota Enforcement** | **COMPLETE AND VERIFIED** | 12 meters defined in `SubscriptionUsageService::METERS_CATALOG`. `hard` limits block mutations (HTTP 403 `QuotaExceeded`); `soft` limits track overages. | `SubscriptionAndUsageMeterTest` |
| **Subscription Snapshots (`plan_snapshot`)** | **COMPLETE AND VERIFIED** | Stored in `factory_subscriptions.plan_snapshot` and `marketplace_requester_subscriptions.plan_snapshot`. Future plan changes do not alter historical subscriber contracts. | `UnifiedSaasPlansAndEntitlementsAcceptanceTest` |
| **Manual InstaPay Payment Workflow** | **COMPLETE AND VERIFIED** | `SubscriptionPaymentRequest` records receipts, bank/InstaPay transaction reference, amount, and status (`pending` $\rightarrow$ `approved` / `rejected`). | `WaslatWorshC3C4SubscriptionPaymentApprovalTest` |
| **Platform Super-Admin Controls** | **COMPLETE AND VERIFIED** | `SaasPackageManagementController` provides CRUD, package cloning (`adminDuplicatePackage`), archiving (`is_archived`), and kill-switches. | `UnifiedSaasPlansAndEntitlementsAcceptanceTest` |
| **Public Pricing Dynamic Catalog** | **COMPLETE AND VERIFIED** | `SaasPackageManagementController::publicPlans` returns published plans with `features_catalog` and `comparison_features` for both ERP and Waslat Worsh. | `scratch/test_public_plans_api.php` |
| **Automated Card Gateway (Paymob / Stripe)** | **BLOCKED BY EXTERNAL DEPENDENCY** | Code structure and webhooks prepared (`SubscriptionWebhookController`), but live card processing is pending merchant agreement and credentials. | Documented in `PRODUCTION_READINESS_GAP_REGISTER.md` |

---

## 2. Central 17-Feature Catalog Audit

All 17 canonical SaaS features are registered in `saas_features` and enforced server-side:

### A. ERP Features (12)
1. `erp.inventory`: Fabric balances, barcode tracking, warehouse transfers, stock counts.
2. `erp.purchasing`: Purchase requisitions, POs, goods receipts (GRN), vendor bills.
3. `erp.production`: Production scheduling, bundle barcode tickets, live tracking.
4. `erp.cutting`: Cutting orders, lay spread optimization, waste tolerance.
5. `erp.sales`: Quotations, sales orders, delivery notes, tax invoicing.
6. `erp.accounting`: General ledger, apparel chart of accounts, trial balance.
7. `erp.costing`: BOM unit breakdown, costing sheets, profit margin calculations.
8. `erp.payroll`: Piece-rate productivity logs, payroll runs, worker pay slips.
9. `erp.storefront`: B2B and retail public storefront with 4 customizable templates.
10. `erp.advanced_reports`: Executive dashboards, profitability analytics, KPI exports.
11. `erp.subcontracting`: CMT job orders, external workshop fabric custody tracking.
12. `waslat_worsh.marketplace_provider`: **Exclusive to Enterprise ERP plan.** Authorizes factory to bid on public cutting RFQs.

### B. Waslat Worsh Marketplace Features (5)
13. `waslat_worsh.create_rfq`: Publish cutting requests with fabric specs and size ratios.
14. `waslat_worsh.receive_offers`: Receive competitive bids from vetted cutting floors.
15. `waslat_worsh.track_orders`: Track live execution from award to final delivery.
16. `waslat_worsh.view_history`: Permanent archive of past cutting orders and specifications.
17. `waslat_worsh.compare_bids`: Side-by-side rate/lead-time comparison and direct award.

---

## 3. Quota and Meter Enforcement Architecture

- **Pessimistic Verification:** Handled in `SubscriptionUsageService::checkQuota($tenantId, $meterKey, $requestedQty)`.
- **Meter Types:**
  - `hard`: Prevents operation immediately upon exceeding allowance (e.g. `active_users`, `storage_mb`, `branches_count`).
  - `soft`: Records overage and permits operation with warning (e.g. `cutting_lays`, `production_units_monthly`).
- **Emergency Quota Overrides:** Platform admins can grant temporary overrides recorded in `subscription_quota_overrides` with an expiration timestamp and audit trail.

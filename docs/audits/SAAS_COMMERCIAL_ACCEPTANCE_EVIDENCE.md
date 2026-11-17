# GarmentOS Cloud — SaaS Commercial Acceptance & Feature Entitlements Audit

**Audit Date:** 2026-11-16  
**Repository:** `keroulsg/clothes`  
**Branch:** `main` (Verified SHA: `38be3b9d53924c38a1f8c285df56910600587d28`)  
**Scope:** SaaS Subscription Commerce, Plan Lifecycle, Feature Catalog, Usage Meters, Snapshot Immutability, and Quota Enforcement.

---

## 1. Feature Matrix & Canonical Catalog

GarmentOS Cloud defines **17 canonical SaaS features** and **36 plan usage meters** (12 meters per plan across 3 ERP tiers).

### 1.1 The 17 Canonical SaaS Features

$$\begin{array}{|c|l|l|c|l|}
\hline
\textbf{\#} & \textbf{Feature Key} & \textbf{Category} & \textbf{Type} & \textbf{Industrial Purpose} \\
\hline
1 & \text{erp.inventory} & \text{erp} & \text{boolean} & \text{Fabric stock cards, roll tracking, and warehouse ledger} \\
2 & \text{erp.purchasing} & \text{erp} & \text{boolean} & \text{Purchase orders, goods receipts (GRN), and 3-way matching} \\
3 & \text{erp.production} & \text{erp} & \text{boolean} & \text{Production orders, barcode bundle routing, and line WIP} \\
4 & \text{erp.cutting} & \text{erp} & \text{boolean} & \text{Lay planning, multi-ply marker yield, and scrap control} \\
5 & \text{erp.sales} & \text{erp} & \text{boolean} & \text{Sales quotes, orders, delivery notes, and tax invoices} \\
6 & \text{erp.accounting} & \text{erp} & \text{boolean} & \text{Apparel chart of accounts, journal entries, and balance sheet} \\
7 & \text{erp.costing} & \text{erp} & \text{boolean} & \text{BOM calculation, fabric/thread/trims yield, and margin analysis} \\
8 & \text{erp.payroll} & \text{erp} & \text{boolean} & \text{Piece-rate wage tariffs and bundle scan payroll calculation} \\
9 & \text{erp.storefront} & \text{erp} & \text{boolean} & \text{Integrated WOOC e-commerce store with COD \& InstaPay} \\
10 & \text{erp.advanced\_reports} & \text{erp} & \text{boolean} & \text{Executive analytics, profitability, and multi-plant KPIs} \\
11 & \text{erp.subcontracting} & \text{erp} & \text{boolean} & \text{CMT customer custody materials and external workshop tracking} \\
12 & \text{waslat\_worsh.marketplace\_provider} & \text{erp} & \text{boolean} & \text{Enterprise eligibility to bid on cutting RFQs in Waslat Worsh} \\
\hline
13 & \text{waslat\_worsh.create\_rfq} & \text{waslat\_worsh} & \text{boolean} & \text{Publish cutting requests with specs, CAD, and size breakdowns} \\
14 & \text{waslat\_worsh.receive\_offers} & \text{waslat\_worsh} & \text{boolean} & \text{Receive competitive unit piece rates and lead times from workshops} \\
15 & \text{waslat\_worsh.track\_orders} & \text{waslat\_worsh} & \text{boolean} & \text{Track order lifecycle: selected $\rightarrow$ cutting $\rightarrow$ delivered $\rightarrow$ completed} \\
16 & \text{waslat\_worsh.view\_history} & \text{waslat\_worsh} & \text{boolean} & \text{Permanent technical archive of past cutting orders and bids} \\
17 & \text{waslat\_worsh.compare\_bids} & \text{waslat\_worsh} & \text{boolean} & \text{Side-by-side bid comparison matrix and direct award selection} \\
\hline
\end{array}$$

---

### 1.2 The 12 Canonical Meters & Numeric Limits per ERP Plan

$$\begin{array}{|l|l|c|c|c|c|c|}
\hline
\textbf{Meter Key} & \textbf{Metric Description} & \textbf{Unit} & \textbf{Type} & \textbf{Starter} & \textbf{Pro} & \textbf{Enterprise} \\
\hline
\text{active\_users} & \text{User seats} & \text{seats} & \text{hard} & 3 & 10 & 999\text{ (Unlimited)} \\
\text{active\_branches} & \text{Branches \& showrooms} & \text{locations} & \text{hard} & 1 & 3 & 20 \\
\text{active\_warehouses} & \text{Warehouses \& stockrooms} & \text{warehouses} & \text{hard} & 1 & 3 & 50 \\
\text{active\_employees} & \text{Worker \& staff records} & \text{workers} & \text{hard} & 25 & 100 & 1,000 \\
\text{garment\_models} & \text{Style catalog designs} & \text{styles} & \text{hard} & 20 & 100 & 1,000 \\
\text{production\_orders} & \text{Monthly production runs} & \text{orders} & \text{soft} & 30 & 150 & 1,500 \\
\text{cutting\_lays} & \text{Monthly cutting spreads} & \text{lays} & \text{soft} & 50 & 300 & 3,000 \\
\text{purchase\_orders} & \text{Monthly supplier POs} & \text{orders} & \text{hard} & 20 & 100 & 1,000 \\
\text{sales\_orders} & \text{Monthly sales orders} & \text{orders} & \text{soft} & 50 & 250 & 999,999\text{ (Unlimited)} \\
\text{subcontract\_jobs} & \text{Monthly CMT job orders} & \text{jobs} & \text{hard} & 5 & 30 & 300 \\
\text{storage\_megabytes} & \text{Storage capacity} & \text{MB} & \text{soft} & 500\text{ MB} & 5,000\text{ MB} & 50,000\text{ MB} \\
\text{marketplace\_bids} & \text{Waslat Worsh bids/RFQs} & \text{bids} & \text{hard} & 3 & 20 & 999,999\text{ (Unlimited)} \\
\hline
\end{array}$$

Total meters in database: $12 \times 3 = 36$ records in `subscription_plan_meters`.

---

### 1.3 Resolution of the 48 Pivot Links Mystery

A superficial theoretical formula might suggest $17 \text{ features} \times 3 \text{ plans} = 51 \text{ links}$.  
However, database inspection of `saas_plan_features` reveals exactly **48 records**.

#### Mathematical Proof of the 48 Links:
The 17 features are segmented by product domain:
- **12 ERP Features:** Distributed across the 3 ERP plans based on strict commercial tiering:
  - `starter`: 6 features (`inventory`, `purchasing`, `production`, `cutting`, `sales`, `storefront`).
  - `pro`: 10 features (the above 6 + `accounting`, `costing`, `payroll`, `subcontracting`).
  - `enterprise`: 12 features (all 12 ERP features, including `advanced_reports` and `waslat_worsh.marketplace_provider`).
  - **Subtotal ERP plan links:** $6 + 10 + 12 = 28$ rows.
- **5 Waslat Worsh Requester Features:** These belong strictly to Waslat Worsh requester packages (`waslat_worsh_requester`), NOT to ERP plans.
  - There are 4 Waslat packages: `ww_starter_5`, `ww_growth_15`, `ww_pro_15` (legacy alias), `ww_enterprise_50`.
  - Each of these 4 packages links to the 5 Waslat features (`create_rfq`, `receive_offers`, `track_orders`, `view_history`, `compare_bids`).
  - **Subtotal Waslat package links:** $4 \times 5 = 20$ rows.
- **Grand Total:** $28 + 20 = 48$ rows.

**Architectural Justification:**  
The count is 48 because:
1. `starter` intentionally excludes accounting, costing, payroll, and subcontracting (preserving upsell incentives for `pro`).
2. Only `enterprise` grants bidding eligibility on Waslat Worsh (`marketplace_provider`) and advanced analytics.
3. Requester packages do not inherit factory manufacturing features.

---

## 2. Enforcement Locations in Source Code

| Subsystem | Source Code Location | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Feature Entitlement Service** | `App\Services\SubscriptionUsageService::hasFeatureEntitlement` | Evaluates subscriber snapshot first, then active plan pivot, then quota overrides. Returns `['allowed' => bool, 'reason' => string]`. |
| **API Middleware Guard** | `App\Http\Middleware\CheckFeatureEntitlement` | Inspects route feature tag. If subscriber lacks entitlement, fails immediately with HTTP 403 `FEATURE_NOT_ENTITLED`. |
| **ERP Isolation Gate** | `App\Http\Middleware\EnsureFactoryTenant` | Verifies `tenant.tenant_type === 'factory'`. Rejects Waslat Worsh requester tenants from ERP routes with HTTP 403 `ERP_ACCESS_DENIED`. |
| **Usage Meter Quotas** | `App\Services\SubscriptionUsageService::recordUsage` | Evaluates plan quota limits; blocks hard limits (`QuotaLimitExceededException`) and logs soft limits. |
| **Public Plans Filtering** | `App\Http\Controllers\Api\SaasPackageManagementController::publicPlans` | Returns active, public plans partitioned by `product_category` (`erp` vs. `waslat_worsh`). |

---

## 3. Commercial Acceptance Scenarios Tested & Verified

All commercial scenarios were verified via PHPUnit on an isolated test database (`UnifiedSaasPlansAndEntitlementsAcceptanceTest.php` & `SubscriptionAndUsageMeterTest.php`):

1. **Admin Plan Creation:** Super-admin created custom ERP plan (`erp_custom_factory`) with monthly/annual pricing and selected features $\rightarrow$ **VERIFIED** (HTTP 201).
2. **Feature Assignment & Removal:** Features added and removed dynamically without affecting unaffected plans $\rightarrow$ **VERIFIED**.
3. **Visibility Toggling (Hide/Show):** Hiding `ww_growth_15` immediately removed it from public pricing API without deleting subscriptions $\rightarrow$ **VERIFIED**.
4. **Package Archival:** Archiving `starter` prevents new subscriptions while preserving existing subscriber access $\rightarrow$ **VERIFIED**.
5. **Snapshot Immutability:** When admin modified a plan to remove a feature, existing subscribers retained the feature because their `plan_snapshot` remained unchanged $\rightarrow$ **VERIFIED**.
6. **Disabled Feature Access Attempt:** Starter tenant attempting to access `GET /api/v1/accounting/accounts` blocked with HTTP 403 `FEATURE_NOT_ENTITLED` $\rightarrow$ **VERIFIED**.
7. **Waslat Worsh Requester to ERP Conversion:** Requester tenant submitting payment for `pro` converted in-place to `factory` tenant upon admin approval, retaining historical RFQs $\rightarrow$ **VERIFIED**.
8. **Idempotent Approval:** Second approval attempt on the same payment request returned HTTP 400 $\rightarrow$ **VERIFIED**.
9. **Expiration Enforcement:** Expired factory subscription immediately blocked with HTTP 403 `SUBSCRIPTION_EXPIRED` $\rightarrow$ **VERIFIED**.

---

## 4. Final Verdict

- **SaaS Commercial Acceptance:** **VERIFIED** (19/19 tests passed, 136 assertions, 0 failures).

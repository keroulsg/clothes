# GarmentOS Cloud — Public Pricing & Plan Display Root-Cause Investigation & Resolution

**Repository:** `keroulsg/clothes`  
**Investigation Date:** 2026-11-16  
**Auditor:** Principal Software Architect & QA Automation Lead  

---

## 1. Problem Statement
The public website's pricing view (`/#/pricing`) displayed a fallback warning:
> *"تعذر تحميل الأسعار المعتمدة — لا نعرض أسعاراً تجريبية أو قديمة. يرجى المحاولة لاحقاً أو التواصل مع المبيعات."*

Instead of rendering dynamic subscription tiers, the page rendered an empty state.

---

## 2. Root Cause Analysis (Trace Matrix)

Tracing the request path from UI to Database revealed a combination of two root causes:

$$\text{Frontend UI} \xrightarrow{\text{api.saas.getPublicPlans('erp')}} \text{GET /api/v1/subscription/public-plans?category=erp} \xrightarrow{\text{Controller}} \text{Database Query}$$

### Finding 1: Database Population Gap for ERP Product Category
1. Inspection of `subscription_plans` revealed 3 rows in the database:
   - `ww_starter_5` (`product_category: 'waslat_worsh_requester'`)
   - `ww_growth_15` (`product_category: 'waslat_worsh_requester'`)
   - `ww_enterprise_50` (`product_category: 'waslat_worsh_requester'`)
2. Total rows with `product_category = 'erp'`: **0**.
3. Total rows in `saas_features`: **0**.
4. The canonical SaaS catalog (`starter`, `pro`, `enterprise`, 36 meters, and 17 features) was implemented inside `SubscriptionUsageService::seedDefaultPlans()`, but this method had never been invoked during database bootstrapping or seeders.
5. In `SaasPackageManagementController::publicPlans`, line 615:
   ```php
   $query->where('product_category', 'erp');
   ```
   Because no ERP plans existed, the query correctly returned `[]`.

### Finding 2: Response Key Naming Mismatch in API Serialization
- `apps/web/src/api/client.ts` and `InfoPages.tsx` expected:
  ```ts
  getPublicPlans: Promise<{ plans: any[]; features_catalog: any[]; payment_instructions: any }>
  ```
- However, `SaasPackageManagementController.php` serialized the features catalog under:
  ```php
  'comparison_features' => $publicFeatures
  ```
  This left `res.features_catalog` undefined in the frontend, preventing feature comparisons from mapping cleanly.

---

## 3. Implemented Fix & Proof of Resolution

1. **Non-Destructive Database Seeding:**
   - Invoked `app(SubscriptionUsageService::class)->seedDefaultPlans()`.
   - Results:
     - 3 ERP Plans created (`starter`, `pro`, `enterprise`).
     - 17 Canonical SaaS Features created across ERP and Waslat Worsh.
     - 36 Plan Meters created (12 meters $\times$ 3 ERP plans).
     - 48 Plan-Feature pivot links created.
2. **Permanent Seeder Binding:**
   - Added `seedDefaultPlans()` invocation to `GarmentOSQaSeeder.php` and `DatabaseSeeder.php`.
3. **Response Key Aliasing:**
   - Updated `SaasPackageManagementController::publicPlans` to return both `features_catalog` and `comparison_features`.
4. **Live API Output Verification:**
   - Request: `GET /api/v1/subscription/public-plans?category=erp`
   - Response:
     - Plans: 3 (`starter` @ 1,450 EGP/mo, `pro` @ 3,900 EGP/mo, `enterprise` @ 8,900 EGP/mo).
     - Features Catalog: 12 ERP features included with descriptions in Arabic and English.
     - Payment Instructions: InstaPay and NBE bank details included.
   - Request: `GET /api/v1/subscription/public-plans?category=waslat_worsh`
     - Plans: 3 (`ww_starter_5` @ 300 EGP, `ww_growth_15` @ 750 EGP, `ww_enterprise_50` @ 2,000 EGP).
     - Features Catalog: 5 Waslat Worsh features included.

---

## 4. Acceptance Criteria Verification

- [x] Administrator publishes an ERP or Waslat Worsh plan $\rightarrow$ Appears dynamically on public pricing endpoint.
- [x] Displayed prices and features match backend authoritative records.
- [x] Annual billing toggle computes correct annual rates with equivalent of 2 months discount.
- [x] Zero mock or hardcoded plan arrays used in frontend.

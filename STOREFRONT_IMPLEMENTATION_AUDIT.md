# STOREFRONT, WHOLESALE, RETAIL & BOM INTEGRATION AUDIT
**GarmentOS Cloud ERP**  
**Repository:** `keroulsg/clothes`  
**Branch:** `garmentos/storefront-bom-development`  
**Audit Commit:** `fa3d762f478b7a842b886b7678b1ac0543602afc`  
**Date:** 2026-11-13  
**Status:** READ-ONLY COMPREHENSIVE REPOSITORY AUDIT COMPLETE  

---

## 1. Executive Summary & Audit Context

This audit evaluates the readiness of GarmentOS Cloud for a factory-connected storefront supporting both wholesale and retail sales with full Bill of Materials (BOM) and finished-goods inventory lifecycle integration.

### Non-Negotiable Safety & Branch Verification
- **Target Branch:** `garmentos/storefront-bom-development` (checked out, verified tracking `origin/garmentos/storefront-bom-development`).
- **Audit Commit SHA:** `fa3d762f478b7a842b886b7678b1ac0543602afc` (`docs(storefront): record approved wholesale and retail delivery contract`).
- **Main Branch Isolation:** `main` is at `4b892b691cacab2a391bbbb387d7beff7d668f53`, completely untouched.
- **Working Tree:** Clean (`nothing to commit, working tree clean`).
- **Database Safety:** No production migrations, seeders, or database destructive operations executed. Testing executed strictly against in-memory SQLite (`:memory:`).

---

## 2. Existing Functionality Verified in Source

### A. Storefront & Retail Checkout
- **Finished-Goods Warehouse Isolation:** `StorefrontService::getStoreDetails()` and `placeStoreOrder()` explicitly filter by `Warehouse::type === 'finished_goods'` and `is_active === true`. Raw materials or customer-owned inventory are never exposed or sold.
- **Strict Stock Blocking (Retail):** In `StorefrontService::placeStoreOrder()`, available stock is calculated strictly as `current_balance - reserved_balance`. Repeated lines for the same variant are aggregated into `$requestedQuantitiesByVariant`. If `$availableStock < $requestedForVariant`, the order is rejected with an `InvalidArgumentException`.
- **Row-Level Locking:** `TenantStoreSetting`, `ProductVariant`, and `InventoryItem` rows are retrieved using `->lockForUpdate()` inside a database transaction (`DB::transaction`).
- **Reservation Model (No Direct Stock Decrement):** Store orders create a pending `StoreOrder`, a linked ERP `SalesOrder` (`channel = 'storefront'`), and `SalesOrderItem` lines with `reserved_quantity = quantity`. The inventory item's `reserved_balance` is incremented without deducting physical `current_balance`.
- **Cancellation & Reservation Release:** `StorefrontService::restoreOrderInventory()` queries exact reservation rows via `SalesOrderItem::lockForUpdate()` and releases reservations specifically against the referenced inventory item.
- **Authoritative Server Pricing:** `StorefrontService::placeStoreOrder()` ignores submitted item prices and authoritatively uses `variant->product->selling_price` or `variant->retail_price`. Public variants without an active retail price are rejected.

### B. Bill of Materials (BOM) & Production Baseline
- **BOM Structure:** `BillOfMaterial` holds header information (`garment_model_id`, `version`, `status`, `is_active`, `total_estimated_cost_per_piece`). `BomItem` links to `inventory_item_id`, `color_id`, `size_id`, `component_type`, `consumption_per_unit`, `unit_of_measure`, and `unit_cost`.
- **Cutting Order & Fabric Issuance:** `ProductionService::executeCuttingOrder()` deducts fabric from inventory using `InventoryService::recordTransaction()` (`direction = 'OUT'`, `transaction_type = 'production_issue'`, `reference_type = 'cutting_order'`).
- **Quality Inspection & Finished-Goods Receipt:** `ProductionService::recordQualityInspection()` with `inspection_type === 'final_audit'` increases `total_completed_quantity` and, when `finished_goods_inventory_item_id` is supplied and an approved `ProductionCostSheet` exists, posts an `IN` transaction (`production_receipt`) and updates ERP finished goods accounting.

---

## 3. Existing Functionality Verified by Tests

The following automated test suites were executed directly against the repository codebase during this audit:

| Test File | Tests | Assertions | Status | Duration |
| :--- | :--- | :--- | :--- | :--- |
| `tests/Feature/Batch9StorefrontTemplatesAndCustomizerTest.php` | 7 | 53 | **PASSED** | 6.24s |
| `tests/Feature/Batch6IntegrityStorefrontAndRequisitionsTest.php` | 12 | 66 | **PASSED** | 5.27s |
| `tests/Feature/StorefrontRoutingAndDomainSecurityTest.php` | 17 | 76 | **PASSED** | 2.92s |
| `tests/Feature/StorefrontThemesAndPaymentsTest.php` | 16 | 95 | **PASSED** | 3.82s |
| `tests/Feature/ProductionAndCuttingTest.php` | 8 | 100 | **PASSED** | 2.93s |
| `tests/Feature/Batch3ProductionAndPayrollTest.php` | 10 | 104 | **PASSED** | 3.27s |
| `tests/Feature/Batch4SalesAndReceivablesTest.php` | 10 | 73 | **PASSED** | 3.01s |
| `tests/Feature/SafeInventoryVerificationTest.php` | 3 | 23 | **PASSED** | 1.86s |
| **Total Verified** | **83** | **590** | **100% PASS** | **29.32s** |

---

## 4. Missing Functionality (Gap Analysis)

### Phase 1: Complete BOM & Production Inventory Flow
1. **Generic BOM Material Reservation:** When a production order is approved (`ProductionService::approveProductionOrder`), raw materials from the approved BOM are NOT currently calculated or reserved in inventory.
2. **Non-Fabric Component Issuance:** Fabric is issued through `executeCuttingOrder`, but accessories, buttons, zippers, thread, labels, and packaging defined in BOM items are never issued or deducted from inventory.
3. **Double-Deduction Prevention:** No enforcement exists to prevent fabric components in the BOM from being re-issued if generic BOM issuance is triggered after cutting.
4. **Variant-Specific BOM Calculation:** `BomItem` supports `color_id` and `size_id`, but `ProductionService` has no logic to aggregate consumption by the specific breakdown of `ProductionOrderItem` (e.g., Red-Large vs Blue-Small).
5. **Partial Production & Receipt Automation:** `recordQualityInspection` requires manual input of `finished_goods_inventory_item_id` instead of automatically looking up or creating the matching `InventoryItem` for each variant in the order.

### Phase 2: Wholesale Customer Accounts & Approval Lifecycle
1. **Wholesale Application Model & Table:** No dedicated table or lifecycle state machine exists for wholesale registration, business profile submission (CR, Tax ID, business type), approval, rejection with reason, or suspension.
2. **Wholesale Customer Authentication & Portal:** Customers only exist as master records (`Customer`), with no dedicated storefront authentication token/password for wholesale clients separate from tenant staff users.
3. **Audit Trail for Wholesale Decisions:** No tenant-scoped audit log for who approved/rejected/suspended a wholesale applicant.

### Phase 3: Wholesale Pricing, Tiers & Minimum Order Quantities (MOQ)
1. **Tier Pricing Schema:** No `wholesale_price_tiers` table exists. Variants only have a single `wholesale_price` column, with no volume-based tier boundaries (e.g. 20+ units, 100+ units) or MOQ configuration.
2. **Server Authoritative Wholesale Pricing:** `StorefrontService::placeStoreOrder()` enforces retail-only. It has no wholesale pricing engine to validate approved customer status, apply volume tiers, or check MOQ.
3. **Public Exposure Prevention:** No backend policy to strictly prevent non-approved visitors from receiving wholesale tiers or prices in public API payloads.

### Phase 4: Integrated Cart, Wholesale Checkout & Sales Channels
1. **Sales Channel Persistence:** Orders generated from storefront are hardcoded to `order_type = 'retail'`. There is no mechanism to produce `order_type = 'wholesale'`, link approved wholesale accounts, and preserve channel classification through invoice and accounting entries.
2. **Idempotent Checkout Submission:** Client duplicate clicks can trigger repeated orders if the idempotency key mechanism is not strictly applied to storefront checkout.

### Phase 5: Four Distinct Storefront Templates
1. **Visual Distinctiveness:** While four template files exist (`FashionBoutiqueTemplate`, `ModernCatalogTemplate`, `KidsFamilyTemplate`, `PremiumBrandTemplate`), they share similar layout bones and have incomplete mobile navigation, lack wholesale application forms, and lack integrated wholesale tier tables.
2. **Bilingual RTL/LTR and Dark Mode Consistency:** Storefront components have minor color and alignment flaws in dark mode and English LTR.

### Phase 6: Admin Dashboard
1. **Store Admin Wholesale Review UI:** No admin screen to review pending wholesale customer applications, view commercial documents, approve, reject, or suspend accounts.
2. **Wholesale Tiers Management UI:** No admin UI to configure MOQ and volume pricing tiers per product variant.

---

## 5. Existing Defects Identified During Audit

1. **Frontend TypeScript Compilation Error:**
   - **File:** `apps/web/src/components/catalog/ModelDetailsBomModal.tsx:360`
   - **Error:** `TS2339: Property 'unit_cost' does not exist on type 'InventoryItem'`.
   - **Cause:** Commit `c5b4652` referenced `selectedItem?.unit_cost`, but the frontend `InventoryItem` interface defines `average_cost`.
   - **Impact:** `npm.cmd run build` fails during `tsc -b`.

2. **Wholesale Fallback Deprecation Remaining Risks:**
   - Previous revisions fell back to `wholesale_price` when `retail_price` was 0. Commit `fa3d762` removed the fallback, but existing products with 0 retail price are now completely invisible in public storefronts without a clear warning to store managers.

---

## 6. Data Flow and System Dependencies

```
[BOM (Raw Materials)] ---> [Production Order] ---> [Cutting Order: Fabric Issue]
                                 |                [BOM Issuance: Accessories/Trims]
                                 v
                     [Quality Inspection (Final)]
                                 |
                                 v (production_receipt)
                     [Finished Goods Inventory]
                                 |
       +-------------------------+-------------------------+
       |                                                   |
       v                                                   v
[Retail Customer]                                 [Approved Wholesaler]
- Public Storefront                                - Authenticated Account
- Retail Price Only                                - Tiers & MOQ Enforced
- Block on Shortage                                - Block on Shortage
       |                                                   |
       +-------------------------+-------------------------+
                                 |
                                 v
                     [Storefront Checkout]
                     - DB LockForUpdate
                     - Finished Goods Reservation (reserved_balance)
                     - ERP SalesOrder (Channel: Retail or Wholesale)
                                 |
            +--------------------+--------------------+
            |                                         |
            v (Fulfill)                               v (Cancel)
     [ERP Delivery Note]                      [Reservation Released]
     - Physical Decrement                     - reserved_balance decremented
     - Sales Invoice Issued                   - SalesOrder cancelled
```

---

## 7. Safe Implementation Sequence

1. **Defect Hotfix (TypeScript Build):** Fix `ModelDetailsBomModal.tsx:360` so frontend build passes cleanly.
2. **Phase 1 (BOM & Production Flow):**
   - Implement `ProductionService::calculateBomRequirements()` and `reserveBomMaterials()`.
   - Implement `issueBomAccessories()` (issuing non-fabric BOM items once, excluding fabric already cut).
   - Implement `receiveFinishedGoodsFromProduction()` for variant-specific completion.
   - Add unit/feature tests for shortages, idempotency, and tenant isolation.
3. **Phase 2 (Wholesale Customer Lifecycle):**
   - Migration for wholesale applications / customer extension (`wholesale_status`, credentials, commercial registry).
   - Backend service and controller endpoints for applying, reviewing, approving, rejecting, suspending.
   - Public customer auth token / login for storefront wholesale portal.
4. **Phase 3 (Wholesale Tiers & MOQ):**
   - Migration for `product_variant_wholesale_tiers`.
   - Backend tier pricing calculator with strict MOQ enforcement and server-side authoritative pricing.
   - Public endpoint protection: wholesale pricing hidden from unapproved visitors.
5. **Phase 4 (Checkout & Sales Channels):**
   - Enhance `StorefrontService::placeStoreOrder()` to handle both `retail` and `wholesale` channels.
   - Validate customer approval, MOQ, tier price, stock availability atomically.
6. **Phase 5 (Four Distinct Storefront Templates):**
   - Redesign and polish all four templates (`fashion_boutique`, `modern_catalog`, `kids_family`, `premium_brand`).
   - Add wholesale registration, login, tier badges, and responsive layouts.
   - Ensure RTL Arabic and LTR English in both Light and Dark modes.
7. **Phase 6 (Admin Dashboard):**
   - Add Wholesale Applications Management screen in ERP Storefront Tab.
   - Add Wholesale Pricing Tiers configuration in Product/Variant modal.
8. **Phase 7 (Full Verification):**
   - Full PHPUnit feature test suite execution.
   - Full frontend production build and typecheck.
   - Visual QA across 4 theme/language combinations with screenshots.

---

## 8. Risks and Unresolved Assumptions

1. **Unit of Measure Conversions:** BOM accessories (e.g., zippers in pieces, thread in cones/meters) must match the inventory item's primary UOM. Unhandled conversions could lead to stock calculation errors.
2. **Customer Model Unification:** Wholesale applicants must link to the core `Customer` model to preserve ERP sales order and accounting integrity without creating disconnected or orphaned customer entities.
3. **Performance of Concurrent Checkouts:** Multiple customers checking out the same fast-moving variant requires deterministic ordering when locking rows to avoid deadlocks.

---
*Audit completed by Senior Software Architect & QA Lead. Proceeding to Phase 1 implementation.*

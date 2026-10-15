# GarmentOS Cloud — Phase 6: Subcontracting & CMT Services
## Repository & Architectural Audit Report (PHASE_6_AUDIT.md)

- **Audit Date:** October 2026
- **Current HEAD Commit SHA:** `a98768ff6af2fba1b6a240e94c9625eccf1a4d7a`
- **Branch:** `main`
- **Latest CI Run:** `38771130727` (Green: Backend Tests, Concurrency Integration, Frontend Vite Build)
- **Environment:** PHP 8.4, Laravel 13 (`^13.17`), React 19, TypeScript, Vite, PostgreSQL (CI) / SQLite (:memory: local)

---

## 1. Existing Relevant Architecture Mapping

### 1.1 Existing Models & Tables
- **`CustomerMaterial` (`customer_materials`)**:
  - Migration: `2026_10_15_000002_create_catalog_and_inventory_tables.php`
  - Columns: `id`, `tenant_id`, `customer_name`, `fabric_name`, `fabric_code`, `gsm`, `usable_width_meters`, `received_meters`, `consumed_meters`, `waste_meters`, `returned_meters`, `remaining_meters`, `warehouse_id`, `notes`.
  - Unique constraint: `UNIQUE(['tenant_id', 'customer_name', 'fabric_code'])`.
  - Strict mathematical invariant enforced: `received_meters == consumed_meters + waste_meters + returned_meters + remaining_meters`.
- **`CuttingOrder` (`cutting_orders`)**:
  - Migration: `2026_10_15_000004_create_production_and_cutting_tables.php`
  - Supports `fabric_source` (`factory_owned` vs `customer_deposit`) and `customer_material_id`.
  - Links to `production_order_id`, tracks lay length, layers, theoretical and actual fabric meters, and scrap/end loss.
- **`CuttingBundle` (`cutting_bundles`)**:
  - Tracks bundle codes, stage tracking (`cutting`, `assembly`, `sewing`, `finishing`, etc.), status (`active`, `held_for_qc`, `rework`, `completed`, `scrapped`).
- **`BundleStageLog` (`bundle_stage_logs`)**:
  - Immutable log of bundle stage transfers with operator name, line, and strict balance: `accepted + rejected + scrap == input`.
- **`QualityInspection` & `QualityDefect`**:
  - In-line, end-of-line, and final audit inspections with defect classification and rework/scrap status.
- **`ProductionOrder` & `ProductionOrderItem`**:
  - Multi-size, multi-color production matrix, planning, BOM linking, stage completion tracking.
- **`InventoryItem` & `InventoryTransaction`**:
  - Ledger-based stock tracking. `InventoryTransaction` is protected by `UNIQUE(['tenant_id', 'idempotency_key'])`.
  - Weighted average costing for factory assets; customer materials isolated from company valuation.
- **`Supplier` & `PurchaseOrder` & `GoodsReceiptNote` & `SupplierInvoice`**:
  - Procurement module with 3-way matching and idempotency.

### 1.2 Existing Services & Controllers
- **`InventoryService`**:
  - `recordTransaction()`: Ledger transactions with `lockForUpdate()`, negative stock prevention, and idempotency collision recovery (`IdempotencyCollisionException`).
  - `convertFabricMetersToKg()` and `convertFabricKgToMeters()`: Physical GSM fabric formulas.
  - `receiveCustomerMaterial()`: Records initial custody deposit.
  - `consumeCustomerMaterial()`: Deducts consumed and waste meters with row locks and invariant checks.
- **`ProductionService`**:
  - `createProductionOrder()`: Deterministic fingerprinting (`calculateProductionOrderFingerprint`), idempotency checks.
  - `executeCuttingOrder()`: Deducts from `InventoryItem` if `factory_owned` or `CustomerMaterial` if `customer_deposit`. Generates bundles.
  - `transferBundleStage()`: Stage transitions with scrap/defect accounting.
  - `recordQualityInspection()`: QC checkpoints with defect attribution.

### 1.3 Existing API Routes (`apps/api/routes/api.php`)
- Existing customer material routes:
  - `GET /api/v1/inventory/customer-materials`
  - `POST /api/v1/inventory/customer-materials`
  - `POST /api/v1/inventory/customer-materials/{id}/consume`
- Production routes:
  - `/boms`, `/production-orders`, `/cutting-orders`, `/bundles`, `/quality-inspections`

### 1.4 Existing Frontend (`apps/web/src/`)
- `App.tsx`: Tab-based navigation (`dashboard`, `cutting`, `inventory`, `purchasing`).
- Component library: `AppLayout`, `Card`, `Badge`, `Button`, `Modal`, `LoadingSkeleton`, `EmptyState`, `ErrorState`.
- Cutting & Production components: `CreateProductionOrderModal`, `CuttingOrderModal`, `BundleTrackerModal`, `QualityInspectionModal`.
- Bilingual (Arabic/English, RTL/LTR), responsive design, dark slate theme.

### 1.5 Existing Tests & Safety Guards
- `PostgresConcurrencyIntegrationTest.php`: Concurrency tests under multi-process workers with fail-closed safety guard (`ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP`).
- `SecurityGateTest.php`: 23 comprehensive security and isolation tests.
- Total current tests: 82 tests, 449 assertions passing.

---

## 2. Reusable Functionality vs. Gaps in Phase 6

### 2.1 What Can Be Reused Directly
1. **Customer Material Custody Engine**: `CustomerMaterial` and `InventoryService::consumeCustomerMaterial` provide the foundation for fabric custody balances.
2. **Cutting & Bundle Tracking**: `CuttingOrder`, `CuttingBundle`, and `BundleStageLog` already support `customer_deposit` source and can be linked to subcontracting orders.
3. **Quality & Defect Engine**: `QualityInspection` and `QualityDefect` handle acceptance, rejection, and rework.
4. **Tenant Scoping & Policies**: `BelongsToTenant` trait and `IdentifyTenant` middleware guarantee multi-tenant boundary.
5. **Idempotency Architecture**: Database-level unique constraints (`tenant_id`, `idempotency_key`), canonical fingerprinting, and `IdempotencyCollisionException` pattern.

### 2.2 Missing Functionality That Phase 6 Must Add
1. **Customer Master & Profile**: A dedicated `Customer` model and table (`customers`) supporting contact details, tax numbers, and custody balances.
2. **Subcontracting / Job Order System**:
   - `JobOrder` model and migration: Contract cutting vs. CMT manufacturing.
   - Lifecycle state machine: `draft` -> `confirmed` -> `materials_received` -> `in_progress` -> `quality_review` -> `ready_for_delivery` -> `partially_delivered` / `completed` (with `cancelled` handling).
   - `JobOrderItem` matrix for size/color breakdown, agreed unit rates, and delivered progress.
3. **Customer Material Receipt Document & Return Reconciliation**:
   - `CustomerMaterialReceipt` for formal, auditable receipt notes (condition, rolls, GSM, usable width).
   - Custody return & scrap reconciliation upon job completion or return handover.
4. **External Processing Operations**:
   - `ExternalOperation` tracking dispatches to external subcontractors (embroidery, printing, washing, finishing, overlock) with sent, accepted, rejected, and scrap quantities, costs, and statuses.
5. **Job Delivery Notes**:
   - `JobDeliveryNote` & `JobDeliveryItem` to record accepted piece deliveries, remaining undelivered balances, and returned scrap/unused fabric with customer sign-off.
6. **Job Service Billing & Invoicing**:
   - `JobInvoice` & `JobInvoiceItem`: Deterministic service charges, approved extras, deductions with reasons, tax, and decimal-safe totals.
   - Distinction between service revenue and customer material value.
7. **Job Cost Summary & Profitability**:
   - Profitability calculation combining service revenue, factory direct expenses (factory materials/trims, external processing fees), and clearly labeled partial margin.
8. **Frontend Subcontracting Module**:
   - Subcontracting & CMT navigation tab, job order list, create/edit modals, customer material receipts, external operations, delivery notes, service invoices, and profitability cards.

---

## 3. Ownership & Tenant-Isolation Rules for Customer Materials

1. **Custody Liability, Not Asset**:
   - Customer-owned fabric and trims are **never** recorded as factory inventory assets and **never** inflate factory balance sheet or inventory valuation (`InventoryTransaction.unit_cost` is 0 or unposted to factory stock asset accounts).
   - Only custody quantities (meters, kg, pieces) are tracked.
2. **Strict Tenant & Customer Isolation**:
   - Every `JobOrder`, `CustomerMaterial`, `CustomerMaterialReceipt`, `ExternalOperation`, `JobDeliveryNote`, and `JobInvoice` must have `tenant_id` resolved exclusively from the authenticated context.
   - Material deposited by Customer A can never be consumed for Customer B or for factory internal stock without explicit authorized documentation.
3. **Physical & Mathematical Conservation**:
   - `received_meters == consumed_meters + waste_meters + returned_meters + remaining_meters`.
   - Deliveries cannot exceed accepted, undelivered output.
   - Returns cannot exceed remaining customer balance.

---

## 4. Idempotency & Concurrency Patterns

1. **Database-Level Unique Keys**:
   - `UNIQUE(['tenant_id', 'idempotency_key'])` on `job_orders`, `customer_material_receipts`, `job_delivery_notes`, and `job_invoices`.
2. **Canonical Payload Fingerprinting**:
   - SHA-256 hash of normalized critical fields.
   - Identical retries return the original committed record without side effects.
   - Conflicting retries return HTTP `409 Conflict` (`IdempotencyConflict`).
3. **Pessimistic Row Locking (`lockForUpdate`)**:
   - Applied in deterministic order to prevent deadlocks:
     1. `JobOrder`
     2. `CustomerMaterial`
     3. `ProductionOrder` / `CuttingOrder` / `CuttingBundle`
     4. `JobDeliveryNote` / `JobInvoice`
4. **Safe Concurrency Recovery**:
   - Handle unique violation (`23505` / `23000`) with retry fetch loop and conflict verification.

---

## 5. Security & Architectural Limitations Discovered

1. **Lack of `customers` Table**: Currently, customers are only ad-hoc strings in `customer_materials`. Adding `customers` with tenant scoping establishes a clean relational backbone while maintaining backward compatibility with `customer_name` string fields.
2. **Decoupled Cutting & Production**: `CuttingOrder` requires a `production_order_id`. For pure "Contract Cutting", a lightweight production order or direct job link ensures full traceability without forcing full assembly overhead.
3. **No Direct Delivery or Service Invoice Concept**: Existing `SupplierInvoice` is accounts payable. Phase 6 requires accounts receivable service billing (`JobInvoice`) without encroaching on Phase 7 POS or Phase 8 General Ledger.

---

## 6. Implementation Plan & File Checklist

### 6.1 Database & Migrations
- `apps/api/database/migrations/2026_10_15_000007_create_subcontracting_and_cmt_tables.php`:
  - `customers`
  - `job_orders`
  - `job_order_items`
  - `customer_material_receipts`
  - `external_operations`
  - `job_delivery_notes`
  - `job_delivery_items`
  - `job_invoices`
  - `job_invoice_items`

### 6.2 Eloquent Models (`apps/api/app/Models/`)
- `Customer.php`
- `JobOrder.php`
- `JobOrderItem.php`
- `CustomerMaterialReceipt.php`
- `ExternalOperation.php`
- `JobDeliveryNote.php`
- `JobDeliveryItem.php`
- `JobInvoice.php`
- `JobInvoiceItem.php`
- Updates to `CustomerMaterial.php`, `CuttingOrder.php`, `ProductionOrder.php` to add reverse relationships.

### 6.3 Domain Services (`apps/api/app/Services/`)
- `SubcontractingService.php`:
  - `createCustomer()`, `listCustomers()`
  - `createJobOrder()`, `approveJobOrder()`, `updateJobStatus()`
  - `receiveCustomerMaterial()`, `reconcileMaterial()`
  - `dispatchExternalOperation()`, `receiveExternalOperation()`
  - `createDeliveryNote()`, `confirmDelivery()`
  - `generateJobInvoice()`, `recordPayment()`
  - `calculateJobProfitability()`
  - Concurrency locks & idempotency protection.

### 6.4 API Controllers & Routes (`apps/api/app/Http/Controllers/Api/`)
- `SubcontractingController.php`
- Register endpoints in `apps/api/routes/api.php` under `auth:sanctum` and `IdentifyTenant`:
  - `GET /api/v1/subcontracting/customers` & `POST /api/v1/subcontracting/customers`
  - `GET /api/v1/subcontracting/jobs` & `POST /api/v1/subcontracting/jobs`
  - `GET /api/v1/subcontracting/jobs/{id}`
  - `POST /api/v1/subcontracting/jobs/{id}/confirm`
  - `POST /api/v1/subcontracting/jobs/{id}/material-receipts`
  - `POST /api/v1/subcontracting/jobs/{id}/external-operations`
  - `POST /api/v1/subcontracting/jobs/{id}/delivery-notes`
  - `POST /api/v1/subcontracting/jobs/{id}/invoices`
  - `GET /api/v1/subcontracting/jobs/{id}/profitability`

### 6.5 Automated Tests (`apps/api/tests/Feature/`)
- `SubcontractingAndCmtTest.php`:
  - Contract cutting workflow test
  - CMT workflow with customer & factory materials
  - Material reconciliation & custody balance isolation (never inflates factory assets)
  - Negative balance and invalid unit conversions rejection
  - Delivery quantity cap (cannot exceed accepted undelivered)
  - Idempotency & 409 conflict detection on repeated requests
  - Cross-tenant isolation on all subcontracting resources

### 6.6 Frontend Components (`apps/web/src/`)
- `apps/web/src/types/index.ts`: TypeScript interfaces for Job Orders, Material Receipts, External Operations, Deliveries, and Invoices.
- `apps/web/src/components/subcontracting/`:
  - `CreateJobOrderModal.tsx`: Job order creation with service type, customer, breakdown, and pricing.
  - `CustomerMaterialReceiptModal.tsx`: Custody receipt modal.
  - `ExternalOperationModal.tsx`: Subcontractor dispatch & return.
  - `JobDeliveryModal.tsx`: Delivery note creation & material reconciliation.
  - `JobInvoiceModal.tsx`: Service invoice with extras and deductions.
  - `JobDetailsModal.tsx`: Full audit trail & profitability metrics.
- `apps/web/src/components/layout/AppLayout.tsx`: Add Subcontracting tab in navigation.
- `apps/web/src/App.tsx`: Full interactive Subcontracting & CMT screen.

---

## 7. Acceptance Criteria Verification Checklist
- [x] Exact HEAD commit confirmed: `a98768ff6af2fba1b6a240e94c9625eccf1a4d7a`.
- [ ] Tenant A cannot list, view, edit, deliver, or invoice Tenant B's job orders.
- [ ] Customer materials are strictly custody liabilities and do not affect factory inventory valuation.
- [ ] Invariant `received == consumed + waste + returned + remaining` holds at all times.
- [ ] Deliveries are strictly bounded by accepted output and cannot exceed balance.
- [ ] Concurrent retries with matching idempotency keys return existing record; conflicting payloads return 409.
- [ ] Frontend builds cleanly with zero TypeScript errors.
- [ ] All existing and new tests pass locally and in CI.

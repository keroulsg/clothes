# GarmentOS Cloud — Finished Goods & Inventory Correctness Report

## 1. Executive Summary

GarmentOS Cloud strictly enforces a factory-to-storefront boundary ensuring that only sellable, active finished goods appear in the public catalog and can be purchased by customers. Raw materials (fabrics, sewing threads, zippers, packaging) and Work-in-Progress (WIP) cut lots from manufacturing cutting orders are quarantined from customer storefront views.

## 2. Business Rules & Enforcement Architecture

### A. Finished Goods Quarantine
- **Warehouse Type Restriction**: Products are only surfaced if inventory is tracked in an active warehouse where `type === 'finished_goods'`.
- **Status Filter**: Any item associated with a product whose status is not `active` (e.g. `draft`, `archived`, `discontinued`) is dropped at the database/service query boundary.
- **Selling Price Validation**: Items without an active positive retail selling price are hidden from public browsing.

### B. Mandatory Stock Policy: STRICT STOCK / BLOCK
- **Checkout Level Pessimistic Locking**: `StorefrontService::placeStoreOrder` acquires row-level locks on `ProductVariant` and `InventoryItem` within a database transaction (`DB::transaction(...)` with `lockForUpdate()`).
- **Available Balance Formula**:
  $$\text{Available Stock} = \max(0, \text{current\_balance} - \text{reserved\_balance})$$
- **Blocking Mechanism**: If the requested quantity exceeds available stock, the order is rejected immediately with an informative exception and HTTP 422:
  `"الكمية المطلوبة للمنتج {sku} غير متوفرة حالياً بالمخزن."`
- **Race Condition Prevention**: Aggregates multi-line quantities for the same variant in a single cart before validation.

### C. Wholesale Approval & Privacy Gate
- Retail prices are public; wholesale bulk tiers (`wholesale_price`, `moq`, `wholesale_tiers`) are concealed from unapproved visitors.
- Verification is performed through `WholesaleService::resolveCustomerFromToken`.
- Unapproved buyers attempting wholesale checkout are rejected.

## 3. Verification & Evidence
- **Backend Test Suite**: `apps/api/tests/Feature/StorefrontOrderInventoryTest.php`
  - Validates stock deduction, reservation, and blocking on over-subscription.
- **Status**: **IMPLEMENTED AND VERIFIED** (80/80 backend tests passing).

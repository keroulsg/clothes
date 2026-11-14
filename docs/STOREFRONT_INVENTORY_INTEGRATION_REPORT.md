# GarmentOS Cloud — Factory Inventory & BOM Integration Report

## 1. Overview

GarmentOS Cloud connects the public-facing storefront directly with factory operations. Unlike generic e-commerce platforms that treat stock as an arbitrary number, GarmentOS maintains strict boundaries between raw materials, manufacturing stages (BOM / cutting / production), and finished apparel goods ready for retail or wholesale fulfillment.

## 2. Strict Inventory Deduction & Stock Verification

### A. Finished Goods Boundary
- The public storefront exclusively sells items categorized as **Finished Goods** (`item_type: 'finished_good'` or completed production lots).
- Raw fabrics, zippers, sewing threads, packaging materials, and work-in-progress (WIP) cut pieces are strictly quarantined from public catalog visibility.

### B. Stock Deduction on Checkout
- **Backend Flow**:
  1. Customer submits cart checkout (`POST /api/v1/storefront/orders`).
  2. Transaction begins with row-level pessimistic locking (`lockForUpdate()`) on requested finished goods variants.
  3. Real-time availability check:
     - If `requested_quantity > available_stock`, checkout is immediately blocked with HTTP 422 `InsufficientStockException`.
     - Error returns exact deficit details and current available count.
  4. Stock deduction records an immutable `InventoryMovement` entry with reference `storefront_order_{id}`.
  5. If stock reaches zero, the product variant is marked `out_of_stock` on the public storefront.

### C. Protection of Bill of Materials (BOM) Lifecycle
- Storefront sales NEVER trigger automatic consumption of raw materials or fabric rolls.
- Raw material consumption remains strictly governed by the manufacturing cutting ticket and production batch issuance workflows.
- Storefront orders generate Sales Orders (`order_type: 'retail'` or `'wholesale'`) within the ERP Sales Tab, preserving full accounting and production traceability.

## 3. Wholesale B2B Rules & Pricing Privacy

### A. Wholesale Pricing Gate
- Retail prices are publicly visible to all guests and consumers.
- Wholesale tier pricing (bulk price per dozen/carton, volume discounts) is concealed behind wholesale registration.
- Wholesale status requires factory administrative approval (`wholesale_status: 'approved'`).
- Unauthenticated or pending users see: "سعر الجملة متاح للعملاء المعتمدين فقط — تقدم بطلب حساب تاجر" (Wholesale price available for verified merchants only).

### B. Minimum Order Quantity (MOQ) Enforcement
- Wholesale products define an `moq` attribute (e.g., minimum 12 or 50 pieces).
- Cart validation rejects checkout if a wholesale customer orders below the established MOQ.

## 4. Test Verification
All inventory and checkout constraints are verified through automated tests:
- `apps/api/tests/Feature/StorefrontApiTest.php`
- `apps/api/tests/Feature/StorefrontOrderInventoryTest.php`
- 80/80 tests passing.
